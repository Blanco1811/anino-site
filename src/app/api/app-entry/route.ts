import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createHmac, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { JWT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_ORIGIN = 'https://email.marketing.anino-ai.com';

function goHome() {
  return NextResponse.redirect(new URL('/', 'https://anino-ai.com'));
}

function fail(reason: string) {
  console.warn(`[email-entry] ${reason}`);
  return goHome();
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
    if (!cardId) return fail('missing cardId');

    const authToken = request.cookies.get(JWT_CONFIG.COOKIE.NAME)?.value;
    if (!authToken) return fail('missing auth_token');

    const jwtSecret = new TextEncoder().encode(JWT_CONFIG.SECRET);
    const { payload } = await jwtVerify(authToken, jwtSecret);

    const userId = typeof payload.userId === 'string' ? payload.userId : null;
    if (!userId) return fail('token has no userId');

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

    if (!user) return fail('user not found');
    if (!card?.href) return fail('card not found or inactive');

    let target: URL;
    try {
      target = new URL(card.href);
    } catch {
      return fail('invalid card URL');
    }

    if (target.origin !== EMAIL_ORIGIN) {
      return fail(`wrong target: ${target.origin}`);
    }

    const now = Math.floor(Date.now() / 1000);
    const ticket = signTicket({
      v: 1,
      aud: 'email-marketing',
      nonce: randomBytes(32).toString('base64url'),
      exp: now + 15,
    });

    const entryUrl = new URL('/api/anino-sso', EMAIL_ORIGIN);
    entryUrl.searchParams.set('ticket', ticket);

    console.log('[email-entry] ticket created');
    return NextResponse.redirect(entryUrl);
  } catch (error) {
    console.error(
      '[email-entry] error:',
      error instanceof Error ? error.message : error
    );
    return goHome();
  }
}
