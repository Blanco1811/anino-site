import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  parseILSAmount,
  topUpWallet,
  WalletBillingError,
} from '@/lib/wallet-billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-secret-2025';

function isAdmin(request: NextRequest) {
  return request.headers.get('X-Admin-Password') === ADMIN_PASSWORD;
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const userId = String(body.userId ?? '').trim();
    if (!userId) {
      return NextResponse.json(
        { error: 'חסר מזהה לקוח' },
        { status: 400 }
      );
    }

    const amount = parseILSAmount(body.amount, 'סכום הטעינה');
    const description = String(body.description ?? '').trim();

    const result = await topUpWallet({
      userId,
      amount,
      description: description || 'טעינה ידנית על ידי מנהל',
      referenceId: `admin-topup:${randomUUID()}`,
    });

    return NextResponse.json({
      success: true,
      balance: result.balance,
      transactionId: result.transactionId,
    });
  } catch (error) {
    if (error instanceof WalletBillingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.error('Admin wallet top-up failed:', error);

    return NextResponse.json(
      { error: 'לא ניתן להוסיף כסף ללקוח' },
      { status: 500 }
    );
  }
}
