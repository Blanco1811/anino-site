import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { randomBytes } from 'node:crypto';
import { JWT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAIN_ORIGIN = 'https://anino-ai.com';
const ENTRY_COOKIE = 'anino_wallet_entry_once';

function goHome() {
  return NextResponse.redirect(new URL('/', MAIN_ORIGIN));
}

export async function GET(request: NextRequest) {
  try {

    const token = request.cookies.get(JWT_CONFIG.COOKIE.NAME)?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', MAIN_ORIGIN));
    }

    const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (typeof payload.userId !== 'string') {
      return goHome();
    }

    const response = NextResponse.redirect(
      new URL('/wallet', MAIN_ORIGIN)
    );

    response.cookies.set({
      name: ENTRY_COOKIE,
      value: randomBytes(32).toString('base64url'),
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60,
    });

    return response;
  } catch {
    return goHome();
  }
}
