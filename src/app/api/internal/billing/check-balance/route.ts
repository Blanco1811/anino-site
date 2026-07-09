import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  BillableCallType,
  ensureCallCanStart,
} from '@/lib/call-billing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  return (
    aBuffer.length === bBuffer.length &&
    timingSafeEqual(aBuffer, bBuffer)
  );
}

function authorize(request: NextRequest) {
  const expected = (process.env.ANINO_BILLING_SHARED_SECRET || '').trim();

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'ANINO_BILLING_SHARED_SECRET חסר בשרת.' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  const provided =
    request.headers.get('x-anino-billing-secret') ||
    request.headers.get('x-billing-secret') ||
    bearer;

  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 403 }
    );
  }

  return null;
}

function normalizeType(value: unknown): BillableCallType {
  const raw = String(value || '').trim().toLowerCase();

  if (raw === 'browser' || raw === 'web' || raw === 'realtime') {
    return 'browser';
  }

  return 'twilio';
}

async function handle(request: NextRequest, body: Record<string, any>) {
  const denied = authorize(request);
  if (denied) return denied;

  const agentId = String(body.agentId || body.agent_id || '').trim();
  let userId = String(body.userId || body.user_id || '').trim();

  if (!userId && agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    userId = agent?.userId || '';
  }

  if (!userId) {
    const email = String(body.email || '').trim();

    if (email) {
      const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT "id"
         FROM "User"
         WHERE LOWER("email") = LOWER($1)
         LIMIT 1`,
        email
      );

      userId = rows[0]?.id || '';
    }
  }

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'userId או agentId חובה.' },
      { status: 400 }
    );
  }

  const type = normalizeType(body.type || body.callType || body.service);
  const result = await ensureCallCanStart(userId, type);

  return NextResponse.json({
    ok: result.ok,
    allowed: result.ok,
    type,
    ...result,
  }, { status: result.ok ? 200 : 402 });
}

export async function GET(request: NextRequest) {
  return handle(
    request,
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return handle(request, body);
}
