import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SignJWT } from 'jose';
import { JWT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 1. Verify that the agent exists by slug
    const agent = await prisma.agent.findUnique({
      where: { slug }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 2. Create a new Call record in database
    const call = await prisma.call.create({
      data: {
        agentId: agent.id,
        number: 'browser',
        purpose: agent.purpose || 'Public Voice Chat',
        status: 'in_progress',
        direction: 'browser',
        startedAt: new Date()
      }
    });

    console.log(`Browser call started for agent ${agent.name} (Slug: ${slug}). Call ID: ${call.id}`);
    
    // 3. Create a short-lived signed JWT callToken
    const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
    const callToken = await new SignJWT({ callId: call.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(secret);

    return NextResponse.json({ callId: call.id, callToken });

  } catch (error) {
    console.error('POST browser-call start error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
