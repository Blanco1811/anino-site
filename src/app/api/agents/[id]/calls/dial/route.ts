import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_CONFIG } from '@/lib/config';
import { prisma } from '@/lib/db';
import { TwilioService } from '@/lib/twilio';
import { formatAgent } from '@/lib/agent-utils';

// Helper to get userId from request token
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    let token = request.cookies.get(JWT_CONFIG.COOKIE.NAME)?.value;
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    if (!token) return null;

    const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
    const { payload } = await jwtVerify(token, secret) as { payload: { userId: string } };
    return payload.userId;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const phoneNumber = body.phoneNumber || body.number;
    const goal = body.goal || body.purpose;

    if (!phoneNumber) {
      return NextResponse.json({ error: 'מספר טלפון הוא שדה חובה.' }, { status: 400 });
    }

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: { id, userId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'הסוכן לא נמצא במערכת.' }, { status: 404 });
    }

    // Format phone number
    let formattedNumber = phoneNumber.trim();
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '+972' + formattedNumber.slice(1);
    }

    // Use Twilio Service to make the call
    const twilioCall = await TwilioService.initiateCall(formattedNumber, goal);

    if (!twilioCall.success) {
      return NextResponse.json({
        error: twilioCall.error || 'אירעה שגיאה בביצוע שיחת Twilio.'
      }, { status: twilioCall.status || 500 });
    }

    const twilioCallSid = twilioCall.sid || '';

    // Create the call log in PostgreSQL
    await prisma.call.create({
      data: {
        agentId: id,
        number: formattedNumber,
        purpose: goal || '',
        status: 'calling',
        twilioSid: twilioCallSid,
        startedAt: new Date()
      }
    });

    // Update agent's phone number and set status to calling
    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: {
        phoneNumber: formattedNumber,
        status: 'calling',
        updatedAt: new Date()
      },
      include: {
        calls: true
      }
    });

    // Prepare response agent workspace using formatAgent
    const responseAgent = {
      ...formatAgent(updatedAgent),
      status: 'calling', // override to show current status in response
      calls: updatedAgent.calls.map((c: any) => ({
        id: c.id,
        number: c.number,
        purpose: c.purpose,
        status: c.status,
        scheduledAt: c.scheduledAt,
        startedAt: c.startedAt
      }))
    };

    return NextResponse.json({ success: true, agent: responseAgent, twilioCallSid });

  } catch (error) {
    console.error('POST dial error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'אירעה שגיאה פנימית בעת ניסיון להוציא שיחה.' }, { status: 500 });
  }
}
