import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtVerify } from 'jose';
import { JWT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Parse request body and verify callToken
    const body = await request.json().catch(() => ({}));
    const { callToken } = body;

    if (!callToken) {
      return NextResponse.json({ error: 'callToken is required' }, { status: 403 });
    }

    try {
      const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
      const { payload } = await jwtVerify(callToken, secret);
      const decoded = payload as { callId: string };
      
      if (decoded.callId !== id) {
        return NextResponse.json({ error: 'Token mismatch' }, { status: 403 });
      }
    } catch (jwtErr) {
      console.error('JWT verification failed for ending call:', jwtErr);
      return NextResponse.json({ error: 'Invalid callToken' }, { status: 403 });
    }

    // 2. Find the Call record
    const call = await prisma.call.findUnique({
      where: { id }
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // 3. Enforce: Only update Call with direction = "browser"
    if (call.direction !== 'browser') {
      return NextResponse.json({ error: 'Only browser calls can be updated' }, { status: 400 });
    }

    // 4. Enforce idempotency: If already completed, return success without altering duration or status
    if (call.status === 'completed') {
      console.log(`Call ID ${id} is already completed. Skipping update.`);
      return NextResponse.json({ success: true, message: 'Call already completed' });
    }

    // 5. Calculate endedAt and durationSeconds on the server
    const endedAt = new Date();
    const startedAt = call.startedAt || call.createdAt;
    const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

    // 6. Update call status, endedAt, and durationSeconds
    const updatedCall = await prisma.call.update({
      where: { id },
      data: {
        status: 'completed',
        endedAt,
        durationSeconds
      }
    });

    console.log(`Browser call ID ${id} successfully ended. Duration: ${updatedCall.durationSeconds} seconds.`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('POST call end error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
