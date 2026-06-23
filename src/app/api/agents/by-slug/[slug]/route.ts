import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const agent = await prisma.agent.findUnique({
      where: { slug }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Expose only non-sensitive public details
    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        purpose: agent.purpose || '',
        status: agent.status || 'waiting',
        tone: Array.isArray(agent.tone) ? agent.tone : [],
        slug: agent.slug
      }
    });
  } catch (error) {
    console.error('GET public agent by slug error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
