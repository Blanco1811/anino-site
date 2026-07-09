import { timingSafeEqual, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

function toNumber(value: unknown) {
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function resolveMainUser(body: Record<string, any>) {
  let userId = String(
    body.mainUserId ||
    body.userId ||
    body.user_id ||
    ''
  ).trim();

  const email = String(body.email || '').trim();

  if (userId) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; email: string }>>(
      `SELECT "id", "email" FROM "User" WHERE "id" = $1 LIMIT 1`,
      userId
    );

    if (rows[0]) return rows[0];
  }

  if (email) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; email: string }>>(
      `SELECT "id", "email"
       FROM "User"
       WHERE LOWER("email") = LOWER($1)
       LIMIT 1`,
      email
    );

    if (rows[0]) return rows[0];
  }

  return null;
}

async function getVoiceRate() {
  const rows = await prisma.$queryRawUnsafe<Array<{ rate: string }>>(
    `SELECT "voiceAgentRetailPerMinute"::text AS "rate"
     FROM "PricingSettings"
     ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST
     LIMIT 1`
  );

  const rate = toNumber(rows[0]?.rate);
  return rate > 0 ? rate : 0.8;
}

export async function POST(request: NextRequest) {
  try {
    const denied = authorize(request);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const mainUser = await resolveMainUser(body);

    if (!mainUser) {
      return NextResponse.json(
        { ok: false, error: 'לא נמצא משתמש ראשי לחיוב.' },
        { status: 404 }
      );
    }

    const durationSeconds = Math.max(
      0,
      Math.floor(Number(body.durationSeconds || body.seconds || 0))
    );

    if (durationSeconds <= 0) {
      return NextResponse.json(
        { ok: false, error: 'durationSeconds חייב להיות גדול מ-0.' },
        { status: 400 }
      );
    }

    const rate = await getVoiceRate();
    const amount = roundMoney((rate * durationSeconds) / 60);
    const service = 'voice_agent';

    const referenceId = String(
      body.referenceId ||
      body.externalReference ||
      body.callId ||
      ''
    ).trim();

    if (!referenceId) {
      return NextResponse.json(
        { ok: false, error: 'referenceId חובה כדי למנוע חיוב כפול.' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRawUnsafe<Array<{ id: string; balanceAfter: string }>>(
        `SELECT "id", "balanceAfter"::text AS "balanceAfter"
         FROM "WalletTransaction"
         WHERE "referenceId" = $1
         LIMIT 1`,
        referenceId
      );

      if (existing[0]) {
        return {
          charged: false,
          alreadyCharged: true,
          amount: amount.toFixed(2),
          balanceAfter: existing[0].balanceAfter,
        };
      }

      const walletRows = await tx.$queryRawUnsafe<Array<{ id: string; balance: string }>>(
        `SELECT "id", "balance"::text AS "balance"
         FROM "Wallet"
         WHERE "userId" = $1
         LIMIT 1
         FOR UPDATE`,
        mainUser.id
      );

      const wallet = walletRows[0];
      const balance = toNumber(wallet?.balance);

      if (!wallet || balance < amount) {
        return {
          charged: false,
          insufficientFunds: true,
          amount: amount.toFixed(2),
          balanceAfter: balance.toFixed(2),
        };
      }

      const nextBalance = roundMoney(balance - amount);

      await tx.$executeRawUnsafe(
        `UPDATE "Wallet"
         SET "balance" = $1, "updatedAt" = NOW()
         WHERE "id" = $2`,
        nextBalance,
        wallet.id
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO "WalletTransaction"
         ("id", "walletId", "type", "service", "amount", "balanceAfter", "description", "referenceId", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        randomUUID(),
        wallet.id,
        'charge',
        service,
        amount,
        nextBalance,
        String(body.description || `שיחת AI בדפדפן — ${durationSeconds} שניות`),
        referenceId
      );

      return {
        charged: true,
        amount: amount.toFixed(2),
        balanceAfter: nextBalance.toFixed(2),
      };
    });

    return NextResponse.json(
      {
        ok: Boolean(result.charged),
        userId: mainUser.id,
        email: mainUser.email,
        durationSeconds,
        billing: result,
      },
      { status: (result as any).insufficientFunds ? 402 : 200 }
    );
  } catch (error) {
    console.error('[internal-billing-charge-usage] error:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'שגיאה פנימית בחיוב שימוש.',
      },
      { status: 500 }
    );
  }
}
