import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-secret-2025';

// Helper function to verify admin access
const verifyAdminAccess = (request: NextRequest) => {
  const adminPassword = request.headers.get('X-Admin-Password');
  if (!adminPassword || adminPassword !== ADMIN_PASSWORD) {
    return false;
  }
  return true;
};

// Get all users
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    if (!verifyAdminAccess(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all users from the database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('API - Fetched users:', users);
    
    return NextResponse.json({ 
      users: Array.isArray(users) ? users : []
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    return NextResponse.json(
      { error: 'An error occurred while fetching users' },
      { status: 500 }
    );
  }
}