import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-secret-2025';

function verifyAdminAccess(request: NextRequest) {
  return request.headers.get('X-Admin-Password') === ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'main' },
    });

    return NextResponse.json({
      logoUrl: settings?.logoUrl || null,
      heroLabel: settings?.heroLabel || null,
      heroTitleLine1: settings?.heroTitleLine1 || null,
      heroTitleLine2: settings?.heroTitleLine2 || null,
      heroDescription: settings?.heroDescription || null,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('logo');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'לא נבחר קובץ לוגו' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'אפשר להעלות רק תמונה' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'גודל מקסימלי הוא 5MB' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const allowed = ['png', 'jpg', 'jpeg', 'webp'];

    if (!allowed.includes(extension)) {
      return NextResponse.json({ error: 'העלה PNG, JPG או WEBP בלבד' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'site');
    await mkdir(uploadDir, { recursive: true });

    const fileName = `anino-logo-${Date.now()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(path.join(uploadDir, fileName), buffer);

    const logoUrl = `/api/site-logo?file=${fileName}`;

    await prisma.siteSettings.upsert({
      where: { id: 'main' },
      update: { logoUrl },
      create: { id: 'main', logoUrl },
    });

    return NextResponse.json({ logoUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאה בהעלאת הלוגו' }, { status: 500 });
  }
}


export async function PUT(request: NextRequest) {
  try {
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'main' },
      update: {
        heroLabel: body.heroLabel || null,
        heroTitleLine1: body.heroTitleLine1 || null,
        heroTitleLine2: body.heroTitleLine2 || null,
        heroDescription: body.heroDescription || null,
      },
      create: {
        id: 'main',
        heroLabel: body.heroLabel || null,
        heroTitleLine1: body.heroTitleLine1 || null,
        heroTitleLine2: body.heroTitleLine2 || null,
        heroDescription: body.heroDescription || null,
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json({ error: 'שגיאה בשמירת הפתיח' }, { status: 500 });
  }
}
