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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const agent = await prisma.agent.findFirst({
      where: { id, userId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent: formatAgent(agent) });
  } catch (error) {
    console.error('GET agent by id error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
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
    const { name, phoneNumber, purpose, tone, startTime, endTime } = body;

    const agent = await prisma.agent.findFirst({
      where: { id, userId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    let updatedSlug = agent.slug;
    if (name && name !== agent.name) {
      // Validate slug uniqueness on name change
      const newSlug = slugify(name);
      const isReserved = RESERVED_SLUGS.has(newSlug);
      const slugExists = await prisma.agent.findFirst({
        where: {
          slug: newSlug,
          id: { not: id }
        }
      });
      if (isReserved || slugExists) {
        return NextResponse.json({ error: 'This public link is already taken. Please change the agent name.' }, { status: 400 });
      }
      updatedSlug = newSlug;
    }

    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: {
        name: name || undefined,
        slug: updatedSlug,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
        purpose: purpose !== undefined ? purpose : undefined,
        tone: Array.isArray(tone) ? tone : undefined,
        startTime: startTime !== undefined ? startTime : undefined,
        endTime: endTime !== undefined ? endTime : undefined,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ agent: formatAgent(updatedAgent) });
  } catch (error) {
    console.error('PUT agent error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const agent = await prisma.agent.findFirst({
      where: { id, userId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    await prisma.agent.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE agent error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
