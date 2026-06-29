import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-secret-2025';

function verifyAdminAccess(request: NextRequest) {
  return request.headers.get('X-Admin-Password') === ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cards = await prisma.homeCard.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('Failed to load home cards:', error);
    return NextResponse.json({ error: 'Failed to load cards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const lastCard = await prisma.homeCard.findFirst({
      orderBy: { sortOrder: 'desc' },
    });

    const card = await prisma.homeCard.create({
      data: {
        title: body.title || 'קופסה חדשה',
        description: body.description || 'תיאור הקופסה',
        icon: body.icon || '✨',
        imageUrl: body.imageUrl || null,
        href: body.href || '#',
        color: body.color || 'blue',
        sortOrder: (lastCard?.sortOrder ?? -1) + 1,
        isVisible: body.isVisible ?? true,
      },
    });

    return NextResponse.json({ card });
  } catch (error) {
    console.error('Failed to create home card:', error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!Array.isArray(body.cards)) {
      return NextResponse.json({ error: 'Invalid cards payload' }, { status: 400 });
    }

    await prisma.$transaction(
      body.cards.map((card: any, index: number) =>
        prisma.homeCard.update({
          where: { id: card.id },
          data: {
            title: card.title,
            description: card.description,
            icon: card.icon,
            imageUrl: card.imageUrl || null,
            href: card.href,
            color: card.color,
            isVisible: card.isVisible,
            sortOrder: index,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update home cards:', error);
    return NextResponse.json({ error: 'Failed to update cards' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing card id' }, { status: 400 });
    }

    await prisma.homeCard.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete home card:', error);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
