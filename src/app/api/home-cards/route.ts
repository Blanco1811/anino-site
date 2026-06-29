import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const cards = await prisma.homeCard.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        title: true,
        description: true,
        icon: true,
        imageUrl: true,
        href: true,
        color: true,
      },
    });

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('Failed to load public home cards:', error);
    return NextResponse.json({ cards: [] });
  }
}
