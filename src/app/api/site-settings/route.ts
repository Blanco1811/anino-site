import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'main' },
      select: { logoUrl: true },
    });

    return NextResponse.json(
      { logoUrl: settings?.logoUrl || null },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch {
    return NextResponse.json({ logoUrl: null });
  }
}
