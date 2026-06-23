import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { SignJWT } from 'jose';
import { JWT_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // If user doesn't exist or password doesn't match
    if (!user || user.password !== hashPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create a JWT token
    const payload = { 
      userId: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`
    };
    
    console.log('Login: signing token for user:', user.email);
    
    // Sign the token with the secret
    const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(JWT_CONFIG.EXPIRES_IN)
      .sign(secret);

    // Return user info without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;
    
    // Set the token in a cookie
    const response = NextResponse.json({
      message: 'Login successful',
      user: userWithoutPassword
    });
    
    response.cookies.set({
      name: JWT_CONFIG.COOKIE.NAME,
      value: token,
      httpOnly: JWT_CONFIG.COOKIE.HTTP_ONLY,
      path: JWT_CONFIG.COOKIE.PATH,
      secure: JWT_CONFIG.COOKIE.SECURE,
      maxAge: JWT_CONFIG.COOKIE.MAX_AGE,
      sameSite: JWT_CONFIG.COOKIE.SAME_SITE
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
