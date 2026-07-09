import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, validatePassword } from '@/lib/auth';
import { SignJWT } from 'jose';
import { JWT_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const phone = String(body.phone || '').trim() || null;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        wallet: {
          create: {
            balance: 0,
            currency: 'ILS',
            autoTopUp: {
              create: {}
            }
          }
        }
      }
    });

    const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(JWT_CONFIG.EXPIRES_IN)
      .sign(secret);

    const { password: _password, ...userWithoutPassword } = user;

    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user: userWithoutPassword
      },
      { status: 201 }
    );

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
    console.error('Registration error:', error);

    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
