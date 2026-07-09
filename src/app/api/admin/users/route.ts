import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-secret-2025';

function verifyAdminAccess(request: NextRequest) {
  const adminPassword = request.headers.get('X-Admin-Password');
  return Boolean(adminPassword && adminPassword === ADMIN_PASSWORD);
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAccess(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        wallet: {
          select: {
            balance: true,
            currency: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      users: users.map(({ wallet, ...user }) => ({
        ...user,
        walletBalance: wallet?.balance.toFixed(2) ?? '0.00',
        walletCurrency: wallet?.currency ?? 'ILS',
      })),
    });
  } catch (error) {
    console.error('Error fetching users:', error);

    return NextResponse.json(
      { error: 'An error occurred while fetching users' },
      { status: 500 }
    );
  }
}
