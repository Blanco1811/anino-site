import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';
import { JWT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAIN_ORIGIN = 'https://anino-ai.com';
const WHATSAPP_ORIGIN = 'https://whatsapp-agent.anino-ai.com';
const ENTRY_COOKIE = 'anino_whatsapp_agent_entry_once';

function goLogin() {
  return NextResponse.redirect(new URL('/login', MAIN_ORIGIN));
}

function verifyTicket(ticket: string | null): { userId: string } | null {
  const secret = process.env.ANINO_SSO_SECRET;
  if (!ticket || !secret) return null;

  const parts = ticket.split('.');
  if (parts.length !== 2) return null;

  const [body, signature] = parts;

  const expected = createHmac('sha256', secret)
    .update(body)
    .digest('base64url');

  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));

    if (
      payload?.v !== 1 ||
      payload?.aud !== 'whatsapp-agent' ||
      typeof payload?.sub !== 'string' ||
      typeof payload?.nonce !== 'string' ||
      typeof payload?.exp !== 'number' ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const ticket = verifyTicket(request.nextUrl.searchParams.get('ticket'));
    if (!ticket) return goLogin();

    const user = await prisma.user.findUnique({
      where: { id: ticket.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) return goLogin();

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email;

    const jwtSecret = new TextEncoder().encode(JWT_CONFIG.SECRET);
    const authToken = await new SignJWT({
      userId: user.id,
      email: user.email,
      name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(JWT_CONFIG.EXPIRES_IN)
      .sign(jwtSecret);

    const response = NextResponse.redirect(new URL('/', WHATSAPP_ORIGIN));

    response.cookies.set({
      name: JWT_CONFIG.COOKIE.NAME,
      value: authToken,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: JWT_CONFIG.COOKIE.MAX_AGE,
    });

    response.cookies.set({
      name: ENTRY_COOKIE,
      value: randomBytes(32).toString('base64url'),
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60,
    });

    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error(
      '[anino-whatsapp-agent-sso] error:',
      error instanceof Error ? error.message : error
    );
    return goLogin();
  }
}
