import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_CONFIG } from '@/lib/config';
import { prisma } from '@/lib/db';
import { slugify, formatAgent, RESERVED_SLUGS } from '@/lib/agent-utils';

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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agents = await prisma.agent.findMany({
      where: { userId }
    });

    return NextResponse.json({ items: agents.map(formatAgent) });
  } catch (error) {
    console.error('GET agents error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phoneNumber, purpose, tone, startTime, endTime } = body;

    if (!name) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    // Generate and validate unique slug
    const slug = slugify(name);
    const isReserved = RESERVED_SLUGS.has(slug);
    const existingAgent = await prisma.agent.findUnique({
      where: { slug }
    });

    if (isReserved || existingAgent) {
      return NextResponse.json({ error: 'This public link is already taken. Please change the agent name.' }, { status: 400 });
    }

    const newAgent = await prisma.agent.create({
      data: {
        name,
        slug,
        phoneNumber: phoneNumber || null,
        purpose: purpose || '',
        status: 'waiting',
        tone: Array.isArray(tone) ? tone : [],
        startTime: startTime || '',
        endTime: endTime || '',
        scheduledAt: null,
        userId
      }
    });

    return NextResponse.json({ agent: formatAgent(newAgent) }, { status: 201 });
  } catch (error) {
    console.error('POST agents error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
