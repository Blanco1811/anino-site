import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-secret-2025';

function verifyAdminAccess(request: NextRequest) {
  return request.headers.get('X-Admin-Password') === ADMIN_PASSWORD;
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'לא נבחרה תמונה' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'מותר להעלות רק תמונה' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'גודל תמונה מקסימלי הוא 5MB' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        { error: 'סוג קובץ לא נתמך. השתמש ב־JPG, PNG, WEBP או GIF' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'home-cards');
    const nextUploadDir = path.join(process.cwd(), '.next', 'static', 'uploads', 'home-cards');

    await mkdir(uploadDir, { recursive: true });
    await mkdir(nextUploadDir, { recursive: true });

    const fileName = `home-card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(path.join(uploadDir, fileName), buffer);
    await writeFile(path.join(nextUploadDir, fileName), buffer);

    return NextResponse.json({
      imageUrl: `/api/home-card-image?file=${fileName}`,
    });
  } catch (error) {
    console.error('Failed to upload home-card image:', error);
    return NextResponse.json({ error: 'שגיאה בהעלאת התמונה' }, { status: 500 });
  }
}
