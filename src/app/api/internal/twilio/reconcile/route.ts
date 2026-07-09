import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { reconcilePendingTwilioCalls } from '@/lib/call-billing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return (
    left.length === right.length &&
    crypto.timingSafeEqual(left, right)
  );
}

export async function POST(request: NextRequest) {
  const expected = process.env.TWILIO_RECONCILE_SECRET || '';
  const received = request.headers.get('x-anino-reconcile-secret') || '';

  if (!expected || !received || !safeEqual(expected, received)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await reconcilePendingTwilioCalls();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[twilio-auto-billing] route error:', error);
    return NextResponse.json(
      { error: 'Twilio reconciliation failed' },
      { status: 500 }
    );
  }
}
