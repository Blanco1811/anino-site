import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fileName = request.nextUrl.searchParams.get('file');

    if (!fileName || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', 'site', fileName);
    const file = await readFile(filePath);

    const extension = fileName.split('.').pop()?.toLowerCase();
    const contentType =
      extension === 'png' ? 'image/png' :
      extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' :
      extension === 'webp' ? 'image/webp' :
      'application/octet-stream';

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
  }
}
