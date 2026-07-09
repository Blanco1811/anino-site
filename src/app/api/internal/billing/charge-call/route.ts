import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  BillableCallType,
  chargeCompletedCall,
} from '@/lib/call-billing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

class BillingRouteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

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

function durationFromBody(body: Record<string, any>) {
  const raw =
    body.durationSeconds ??
    body.seconds ??
    body.callDuration ??
    body.CallDuration ??
    body.duration;

  let seconds = Math.max(0, Math.floor(Number(raw || 0)));

  if (!seconds && body.durationMinutes) {
    seconds = Math.max(0, Math.ceil(Number(body.durationMinutes) * 60));
  }

  return seconds;
}

async function resolveOrCreateCall(
  body: Record<string, any>,
  type: BillableCallType,
  durationSeconds: number
) {
  const callId = String(body.callId || body.call_id || '').trim();
  const twilioSid = String(body.twilioSid || body.CallSid || body.callSid || '').trim();
  const externalReference = String(
    body.referenceId ||
      body.externalCallId ||
      body.retellCallId ||
      body.openaiCallId ||
      ''
  ).trim();

  if (callId) {
    const call = await prisma.call.findUnique({ where: { id: callId } });
    if (call) return call;
  }

  if (twilioSid) {
    const call = await prisma.call.findFirst({ where: { twilioSid } });
    if (call) return call;
  }

  if (externalReference) {
    const call = await prisma.call.findFirst({
      where: { retellCallId: externalReference },
    });
    if (call) return call;
  }

  const agentId = String(body.agentId || body.agent_id || '').trim();

  if (!agentId) {
    throw new BillingRouteError(
      400,
      'לא נמצא callId/twilioSid/referenceId, ולכן agentId חובה ליצירת שיחה לחיוב.'
    );
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      purpose: true,
    },
  });

  if (!agent) {
    throw new BillingRouteError(404, 'הסוכן לא נמצא.');
  }

  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);

  return prisma.call.create({
    data: {
      agentId: agent.id,
      number: String(body.number || body.phoneNumber || type || 'internal'),
      purpose: String(body.purpose || body.goal || agent.purpose || 'Internal billed call'),
      status: 'completed',
      direction: type,
      startedAt,
      endedAt,
      durationSeconds,
      twilioSid: twilioSid || null,
      retellCallId: externalReference || null,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const denied = authorize(request);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const type = normalizeType(body.type || body.callType || body.service);
    const durationSeconds = durationFromBody(body);

    if (durationSeconds <= 0) {
      return NextResponse.json(
        { ok: false, error: 'durationSeconds חייב להיות גדול מ-0.' },
        { status: 400 }
      );
    }

    const call = await resolveOrCreateCall(body, type, durationSeconds);

    const updatedCall = await prisma.call.update({
      where: { id: call.id },
      data: {
        status: 'completed',
        endedAt: new Date(),
        durationSeconds,
        startedAt:
          call.startedAt ||
          new Date(Date.now() - durationSeconds * 1000),
      },
    });

    const billing = await chargeCompletedCall(
      updatedCall.id,
      type,
      durationSeconds
    );

    return NextResponse.json(
      {
        ok: Boolean((billing as any).charged),
        callId: updatedCall.id,
        type,
        billing,
      },
      { status: (billing as any).insufficientFunds ? 402 : 200 }
    );
  } catch (error) {
    console.error('[internal-billing-charge-call] error:', error);

    const status =
      error instanceof BillingRouteError ? error.status : 500;

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'שגיאה פנימית בחיוב שיחה.',
      },
      { status }
    );
  }
}
