import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const cards = await prisma.homeCard.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        icon: true,
        imageUrl: true,
        href: true,
        color: true,
      },
    });

    return NextResponse.json(
      { cards },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Failed to load public home cards:', error);
    return NextResponse.json({ cards: [] });
  }
}
