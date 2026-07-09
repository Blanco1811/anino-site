import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_CONFIG } from '@/lib/config';
import { prisma } from '@/lib/db';

async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get(JWT_CONFIG.COOKIE.NAME)?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
    const { payload } = await jwtVerify(token, secret) as {
      payload: { userId: string };
    };

    return payload.userId;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 80,
        },
      },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Failed to load WhatsApp messages:', error);
    return NextResponse.json(
      { error: 'Failed to load WhatsApp messages' },
      { status: 500 }
    );
  }
}
