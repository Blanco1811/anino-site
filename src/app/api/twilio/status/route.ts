import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { chargeCompletedCall } from '@/lib/call-billing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function callbackUrl() {
  const base = (
    process.env.TWILIO_PUBLIC_BASE_URL || 'https://anino-ai.com'
  ).replace(/\/+$/, '');

  return `${base}/api/twilio/status`;
}

function validSignature(
  signature: string,
  authToken: string,
  params: Array<[string, string]>
) {
  const payload =
    callbackUrl() +
    [...params]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}${value}`)
      .join('');

  const expected = createHmac('sha1', authToken)
    .update(payload, 'utf8')
    .digest('base64');

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function POST(request: NextRequest) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    const signature = request.headers.get('x-twilio-signature') || '';

    if (!authToken || !signature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();

    const params = Array.from(formData.entries()).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : value.name,
    ]) as Array<[string, string]>;

    if (!validSignature(signature, authToken, params)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    const callSid = String(formData.get('CallSid') || '').trim();
    const callStatus = String(formData.get('CallStatus') || '')
      .trim()
      .toLowerCase();

    if (!callSid || !callStatus) {
      return new NextResponse(null, { status: 204 });
    }

    const call = await prisma.call.findFirst({
      where: { twilioSid: callSid },
    });

    if (!call) {
      return new NextResponse(null, { status: 204 });
    }

    const rawDuration = Number(formData.get('CallDuration'));
    const durationSeconds = Number.isFinite(rawDuration)
      ? Math.max(0, Math.floor(rawDuration))
      : 0;

    const finalStatuses = new Set([
      'completed',
      'busy',
      'failed',
      'no-answer',
      'canceled',
    ]);

    const updatedCall = await prisma.call.update({
      where: { id: call.id },
      data: {
        status: callStatus === 'in-progress' ? 'in_progress' : callStatus,
        ...(finalStatuses.has(callStatus)
          ? {
              endedAt: new Date(),
              durationSeconds,
            }
          : {}),
      },
    });

    if (callStatus === 'completed' && durationSeconds > 0) {
      await chargeCompletedCall(
        updatedCall.id,
        'twilio',
        durationSeconds
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Twilio callback billing error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
