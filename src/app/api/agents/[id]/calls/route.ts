import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_CONFIG } from '@/lib/config';
import { prisma } from '@/lib/db';
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
    const { number, purpose, status, scheduledAt } = body;

    if (!number) {
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
    let formattedNumber = number.trim();
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '+972' + formattedNumber.slice(1);
    }

    // Create the call log in PostgreSQL
    const newCall = await prisma.call.create({
      data: {
        agentId: id,
        number: formattedNumber,
        purpose: purpose || '',
        status: status || 'waiting',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        startedAt: new Date()
      }
    });

    // Fetch agent with all calls to return
    const updatedAgent = await prisma.agent.findUnique({
      where: { id },
      include: { calls: true }
    });

    if (!updatedAgent) {
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    // Prepare response agent workspace
    const responseAgent = {
      ...formatAgent(updatedAgent),
      calls: updatedAgent.calls.map((c: any) => ({
        id: c.id,
        number: c.number,
        purpose: c.purpose,
        status: c.status,
        scheduledAt: c.scheduledAt,
        startedAt: c.startedAt
      }))
    };

    return NextResponse.json({ success: true, agent: responseAgent }, { status: 201 });

  } catch (error) {
    console.error('POST calls error:', error);
    return NextResponse.json({ error: 'אירעה שגיאה פנימית בעת ניסיון להוסיף שיחה לתור.' }, { status: 500 });
  }
}
