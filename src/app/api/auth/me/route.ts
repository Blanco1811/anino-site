import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db';
import { JWT_CONFIG } from '@/lib/config';

// Configure route segment
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get the token from cookies or authorization header
    let token = request.cookies.get(JWT_CONFIG.COOKIE.NAME)?.value;
    
    // If no cookie token, check Authorization header
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify the token
    try {
      // Verify the token with the secret
      const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
      const { payload: decoded } = await jwtVerify(token, secret) as { payload: { userId: string } };
      
      // Get user data from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Return user info without password - using _ prefix to indicate intentional unused variable
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _password, ...userWithoutPassword } = user;
      
      return NextResponse.json({
        user: {
          ...userWithoutPassword,
          name: `${user.firstName} ${user.lastName}`
        }
      });
    } catch {
      // Catch any token verification errors
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (err) {
    console.error('Auth check error:', err);
    return NextResponse.json(
      { error: 'An error occurred during authentication check' },
      { status: 500 }
    );
  }
}
