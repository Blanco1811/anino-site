import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_CONFIG } from '@/lib/config';
import { prisma } from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-secret-2025';

// Helper to verify admin access
function verifyAdminAccess(request: NextRequest) {
  const adminPassword = request.headers.get('X-Admin-Password');
  return adminPassword === ADMIN_PASSWORD;
}

// Helper to get userId from request token
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    let token = request.cookies.get(JWT_CONFIG.COOKIE.NAME)?.value;
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    if (!token) return null;

    const secret = new TextEncoder().encode(JWT_CONFIG.SECRET);
    const { payload } = await jwtVerify(token, secret) as { payload: { userId: string } };
    return payload.userId;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (userId) {
      const profile = await prisma.businessProfile.findUnique({
        where: { userId }
      });
      return NextResponse.json({ profile: profile || null });
    }

    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.businessProfile.findFirst();
    return NextResponse.json({ profile: profile || null });
  } catch (error) {
    console.error('Error fetching business profile:', error);
    return NextResponse.json({ error: 'Failed to fetch business profile' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const body = await request.json();
    const {
      businessName,
      businessType,
      description,
      openingHours,
      address,
      deliveryAreas,
      phone,
      whatsappNumber,
      whatsappPhoneNumberId,
      menuText,
      faqText,
      agentInstructions,
    } = body;

    // Scoped update for logged-in user
    if (userId) {
      const existing = await prisma.businessProfile.findUnique({
        where: { userId }
      });

      const data = {
        businessName: businessName || '',
        businessType: businessType || '',
        description: description || '',
        openingHours: openingHours || '',
        address: address || '',
        deliveryAreas: deliveryAreas || '',
        phone: phone || '',
        whatsappNumber: whatsappNumber || '',
        whatsappPhoneNumberId: whatsappPhoneNumberId || null,
        menuText: menuText || '',
        faqText: faqText || '',
        agentInstructions: agentInstructions || '',
        userId
      };

      let profile;
      if (existing) {
        profile = await prisma.businessProfile.update({
          where: { userId },
          data
        });
      } else {
        profile = await prisma.businessProfile.create({
          data
        });
      }

      return NextResponse.json({ success: true, profile });
    }

    // Fallback for Admin Password authentication
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      return NextResponse.json({ error: 'No users found in database to associate profile with' }, { status: 400 });
    }

    const existing = await prisma.businessProfile.findFirst();

    const data = {
      businessName: businessName || '',
      businessType: businessType || '',
      description: description || '',
      openingHours: openingHours || '',
      address: address || '',
      deliveryAreas: deliveryAreas || '',
      phone: phone || '',
      whatsappNumber: whatsappNumber || '',
      whatsappPhoneNumberId: whatsappPhoneNumberId || null,
      menuText: menuText || '',
      faqText: faqText || '',
      agentInstructions: agentInstructions || '',
      userId: firstUser.id
    };

    let profile;
    if (existing) {
      profile = await prisma.businessProfile.update({
        where: { id: existing.id },
        data,
      });
    } else {
      profile = await prisma.businessProfile.create({
        data,
      });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Error creating business profile:', error);
    return NextResponse.json({ error: 'Failed to save business profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
