import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';
import { JWT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AGENT_ORIGIN = 'https://agent.anino-ai.com';
const MAIN_ORIGIN = 'https://anino-ai.com';

type TicketPayload = {
  v: number;
  aud: string;
  sub: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  nonce: string;
  exp: number;
};

function verifyTicket(ticket: string | null): TicketPayload | null {
  const secret = process.env.ANINO_SSO_SECRET;
  if (!ticket || !secret) return null;

  const parts = ticket.split('.');
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');

  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TicketPayload;

    if (
      payload.v !== 1 ||
      payload.aud !== 'anino-agent' ||
      typeof payload.sub !== 'string' ||
      typeof payload.nonce !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const ticket = verifyTicket(request.nextUrl.searchParams.get('ticket'));

    if (!ticket) {
      return NextResponse.redirect(new URL('/', MAIN_ORIGIN));
    }

    const email = String(ticket.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.redirect(new URL('/', MAIN_ORIGIN));
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName: ticket.firstName || 'ANINO',
          lastName: ticket.lastName || 'User',
          password: `sso-${randomBytes(24).toString('hex')}`,
        },
      });
    }

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email;

    const jwtSecret = new TextEncoder().encode(JWT_CONFIG.SECRET);

    const authToken = await new SignJWT({
      userId: user.id,
      mainUserId: ticket.sub,
      email: user.email,
      name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(JWT_CONFIG.EXPIRES_IN)
      .sign(jwtSecret);

    const response = NextResponse.redirect(new URL('/', AGENT_ORIGIN));

    response.cookies.set({
      name: JWT_CONFIG.COOKIE.NAME,
      value: authToken,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: JWT_CONFIG.COOKIE.MAX_AGE,
    });

    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('[anino-agent-sso] error:', error);
    return NextResponse.redirect(new URL('/', MAIN_ORIGIN));
  }
}
