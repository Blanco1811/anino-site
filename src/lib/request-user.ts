import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_CONFIG } from '@/lib/config';

export async function getRequestUserId(request: NextRequest): Promise<string | null> {
  let token = request.cookies.get(JWT_CONFIG.COOKIE.NAME)?.value;

  if (!token) {
    const authorization = request.headers.get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
      token = authorization.slice(7);
    }
  }

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
    const { payload } = await jwtVerify(token, secret);

    return typeof payload.userId === 'string' ? payload.userId : null;
  } catch {
    return null;
  }
}
