import { NextRequest, NextResponse } from 'next/server';

type TranslateRequestBody = {
  texts?: string[];
  targetLanguage?: string;
  sourceLanguage?: string;
};

const translationCache = new Map<string, string>();
const MAX_TEXTS = 200;
const MAX_TEXT_LENGTH = 12000;
const CHUNK_SIZE = 1800;

function normalizeLanguage(language?: string, allowAuto = false): string {
  if (!language || typeof language !== 'string') return 'en';
  const normalized = language.split('-')[0].toLowerCase();
  if (allowAuto && normalized === 'auto') return 'auto';
  return normalized;
}

function splitTextToChunks(text: string): string[] {
  if (!text) return [''];
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let end = Math.min(cursor + CHUNK_SIZE, text.length);
    const slice = text.slice(cursor, end);
    const lastBreak = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('\n'));

    if (lastBreak > CHUNK_SIZE * 0.5 && end < text.length) {
      end = cursor + lastBreak + 1;
    }

    chunks.push(text.slice(cursor, end));
    cursor = end;
  }

  return chunks;
}

async function translateChunk(chunk: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: sourceLanguage,
    tl: targetLanguage,
    dt: 't',
    q: chunk,
  });

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Translation provider error: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Unexpected translation response format');
  }

  return data[0].map((part: unknown) => (Array.isArray(part) ? String(part[0] ?? '') : '')).join('');
}

async function translateSingleText(inputText: string, sourceLanguage?: string, targetLanguage?: string): Promise<string> {
  if (!inputText) return inputText;

  const target = normalizeLanguage(targetLanguage);
  const source = sourceLanguage ? normalizeLanguage(sourceLanguage, true) : 'auto';

  if (source !== 'auto' && source === target) return inputText;

  const cacheKey = `${source}|${target}|${inputText}`;
  const cachedValue = translationCache.get(cacheKey);
  if (cachedValue) return cachedValue;

  const chunks = splitTextToChunks(inputText);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    translatedChunks.push(await translateChunk(chunk, source, target));
  }

  const translated = translatedChunks.join('');
  translationCache.set(cacheKey, translated);
  return translated;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TranslateRequestBody;
    const texts = Array.isArray(body.texts) ? body.texts : [];

    if (texts.length === 0) {
      return NextResponse.json({ translations: [] });
    }

    if (texts.length > MAX_TEXTS) {
      return NextResponse.json(
        { message: `Too many texts. Max allowed: ${MAX_TEXTS}` },
        { status: 400 }
      );
    }

    const normalizedTexts = texts.map((text) => {
      if (typeof text !== 'string') return '';
      return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
    });

    const translations = await Promise.all(
      normalizedTexts.map((text) =>
        translateSingleText(text, body.sourceLanguage, body.targetLanguage)
      )
    );

    return NextResponse.json({ translations });
  } catch (error) {
    console.error('Translation API failed:', error);
    return NextResponse.json(
      { message: 'Failed to translate text' },
      { status: 500 }
    );
  }
}
