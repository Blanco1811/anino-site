import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createHmac, randomBytes } from 'node:crypto';
import { JWT_CONFIG } from '@/lib/config';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAIN_ORIGIN = 'https://anino-ai.com';
const AGENT_ORIGIN = 'https://agent.anino-ai.com';

function goHome() {
  return NextResponse.redirect(new URL('/', MAIN_ORIGIN));
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
  const referer = request.headers.get('referer');

  try {
    if (!referer) return goHome();

    const refererUrl = new URL(referer);
    const cameFromMainSite =
      refererUrl.hostname === 'anino-ai.com' ||
      refererUrl.hostname === 'www.anino-ai.com';

    if (!cameFromMainSite) return goHome();
  } catch {
    return goHome();
  }

  const token = request.cookies.get(JWT_CONFIG.COOKIE.NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', MAIN_ORIGIN));
  }

  try {
    const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
    const { payload } = await jwtVerify(token, secret);

    const userId = typeof payload.userId === 'string' ? payload.userId : null;
    if (!userId) return goHome();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) return goHome();

    const now = Math.floor(Date.now() / 1000);
    const ticket = signTicket({
      v: 1,
      aud: 'anino-agent',
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      nonce: randomBytes(32).toString('base64url'),
      exp: now + 15,
    });

    const entryUrl = new URL('/api/anino-agent-sso', AGENT_ORIGIN);
    entryUrl.searchParams.set('ticket', ticket);

    console.log('[agent-entry] ticket created');
    return NextResponse.redirect(entryUrl);
  } catch (error) {
    console.error(
      '[agent-entry] error:',
      error instanceof Error ? error.message : error
    );
    return goHome();
  }
}
