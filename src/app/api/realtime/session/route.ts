import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_CONFIG } from '@/lib/config';
import { prisma } from '@/lib/db';
import { getAgentInstructions } from '@/lib/agent-utils';
import { ensureCallCanStart } from '@/lib/call-billing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    let token = request.cookies.get(JWT_CONFIG.COOKIE.NAME)?.value;
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
      const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
      const { payload } = await jwtVerify(token, secret) as { payload: { userId: string } };
      userId = payload.userId;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Check OpenAI API Key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'PUT_OPENAI_KEY_HERE') {
      return NextResponse.json({
        error: 'OpenAI API key is missing. Please add OPENAI_API_KEY to your environment variables.'
      }, { status: 500 });
    }

    // 3. Find user's agent to fetch instructions and tone
    const userAgent = await prisma.agent.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
      id: true,
      name: true,
      slug: true,
      purpose: true,
      status: true,
      tone: true,
      startTime: true,
      endTime: true,
      scheduledAt: true,
      userId: true,
      phoneNumber: true,
      greeting: true,
      imageUrl: true,
    },
    });

    // ANINO_DASHBOARD_SESSION_BALANCE_CHECK
    if (!userAgent) {
      return NextResponse.json(
        { error: 'לא נמצא סוכן לחשבון הזה.' },
        { status: 404 }
      );
    }

    const balanceCheck = await ensureCallCanStart(userId, 'browser');

    if (!balanceCheck.ok) {
      return NextResponse.json(
        {
          error: balanceCheck.error || 'אין יתרה מספקת להתחלת שיחה.',
          required: balanceCheck.required,
          balance: balanceCheck.balance,
        },
        { status: 402 }
      );
    }

    const instructions = userAgent 
      ? getAgentInstructions(userAgent) 
      : 'You are a low-latency voice agent.';

    // 4. Request ephemeral session token from OpenAI Realtime API
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Safety-Identifier': 'anino-browser-session'
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime-2',
          audio: {
            output: {
              voice: 'alloy'
            }
          },
          instructions: instructions
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        error: `OpenAI Realtime API error: ${errorText}`
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Realtime session error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create OpenAI Realtime session.'
    }, { status: 500 });
  }
}
