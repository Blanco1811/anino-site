import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createHmac, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { JWT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAIN_ORIGIN = 'https://anino-ai.com';
const WHATSAPP_ORIGIN = 'https://whatsapp-agent.anino-ai.com';

function goHome() {
  return NextResponse.redirect(new URL('/', MAIN_ORIGIN));
}

function goLogin() {
  return NextResponse.redirect(new URL('/login', MAIN_ORIGIN));
}

function signTicket(payload: Record<string, unknown>) {
  const secret = process.env.ANINO_SSO_SECRET;
  if (!secret) throw new Error('missing ANINO_SSO_SECRET');

  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(body)
    .digest('base64url');

  return `${body}.${signature}`;
}

export async function GET(request: NextRequest) {
  try {
    const cardId = request.nextUrl.searchParams.get('cardId');
    if (!cardId) return goHome();

    const authToken = request.cookies.get(JWT_CONFIG.COOKIE.NAME)?.value;
    if (!authToken) return goLogin();

    const jwtSecret = new TextEncoder().encode(JWT_CONFIG.SECRET);
    const { payload } = await jwtVerify(authToken, jwtSecret);

    const userId = typeof payload.userId === 'string' ? payload.userId : null;
    if (!userId) return goLogin();

    const [user, card] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      prisma.homeCard.findFirst({
        where: { id: cardId, isVisible: true },
        select: { href: true },
      }),
    ]);

    if (!user || !card?.href) return goHome();

    const target = new URL(card.href);
    if (target.origin !== WHATSAPP_ORIGIN) return goHome();

    const now = Math.floor(Date.now() / 1000);
    const ticket = signTicket({
      v: 1,
      aud: 'whatsapp-agent',
      sub: userId,
      nonce: randomBytes(32).toString('base64url'),
      exp: now + 15,
    });

    const entryUrl = new URL(
      '/api/anino-whatsapp-agent-sso',
      WHATSAPP_ORIGIN
    );
    entryUrl.searchParams.set('ticket', ticket);

    console.log('[whatsapp-agent-entry] ticket created');
    return NextResponse.redirect(entryUrl);
  } catch (error) {
    console.error(
      '[whatsapp-agent-entry] error:',
      error instanceof Error ? error.message : error
    );
    return goHome();
  }
}
