import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
]);

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'PUT_OPENAI_KEY_HERE') {
      return NextResponse.json(
        { error: 'OpenAI API key is missing.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const voice = String(body.voice || 'alloy').toLowerCase().trim();

    if (!ALLOWED_VOICES.has(voice)) {
      return NextResponse.json(
        { error: 'Invalid voice.' },
        { status: 400 }
      );
    }

    const text =
      typeof body.text === 'string' && body.text.trim()
        ? body.text.trim().slice(0, 220)
        : 'שלום, אני הסוכן של אנינו. איך אפשר לעזור?';

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
        voice,
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OpenAI speech error: ${errorText}` },
        { status: response.status }
      );
    }

    const audio = await response.arrayBuffer();

    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('voice preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Voice preview failed.' },
      { status: 500 }
    );
  }
}
