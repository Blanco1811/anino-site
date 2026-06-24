import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAgentInstructions } from '@/lib/agent-utils';

export const dynamic = 'force-dynamic';

export async function POST(
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

    // Check OpenAI API Key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'PUT_OPENAI_KEY_HERE') {
      return NextResponse.json({
        error: 'OpenAI API key is missing. Please add OPENAI_API_KEY to your environment variables.'
      }, { status: 500 });
    }

    // Request ephemeral session token from OpenAI Realtime API using unified getAgentInstructions
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
          instructions: getAgentInstructions(agent)
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
    console.error('Public realtime session error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create OpenAI Realtime session.'
    }, { status: 500 });
  }
}
