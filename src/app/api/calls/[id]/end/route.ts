import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtVerify } from 'jose';
import { JWT_CONFIG } from '@/lib/config';
import { chargeCompletedCall } from '@/lib/call-billing';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { callToken } = body;

    if (!callToken) {
      return NextResponse.json(
        { error: 'callToken is required' },
        { status: 403 }
      );
    }

    try {
      const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
      const { payload } = await jwtVerify(callToken, secret);
      const decoded = payload as { callId: string };

      if (decoded.callId !== id) {
        return NextResponse.json(
          { error: 'Token mismatch' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid callToken' },
        { status: 403 }
      );
    }

    const call = await prisma.call.findUnique({ where: { id } });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    if (call.direction !== 'browser') {
      return NextResponse.json(
        { error: 'Only browser calls can be updated' },
        { status: 400 }
      );
    }

    let completedCall = call;

    if (call.status !== 'completed') {
      const endedAt = new Date();
      const startedAt = call.startedAt || call.createdAt;
      const durationSeconds = Math.max(
        0,
        Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
      );

      completedCall = await prisma.call.update({
        where: { id },
        data: {
          status: 'completed',
          endedAt,
          durationSeconds,
        },
      });
    }

    const billing = await chargeCompletedCall(
      completedCall.id,
      'browser',
      completedCall.durationSeconds || 0
    );

    return NextResponse.json({ success: true, billing });
  } catch (error) {
    console.error('Browser call billing error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
