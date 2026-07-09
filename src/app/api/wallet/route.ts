import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { reconcileLatestTwilioCallForUser } from '@/lib/call-billing';
import { getRequestUserId } from '@/lib/request-user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    try {
      await reconcileLatestTwilioCallForUser(userId);
    } catch (syncError) {
      console.error('Twilio wallet sync failed:', syncError);
    }

    const wallet = await prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        balance: new Prisma.Decimal(0),
        currency: 'ILS',
      },
    });

    const autoTopUp = await prisma.autoTopUpSettings.upsert({
      where: { walletId: wallet.id },
      update: {},
      create: { walletId: wallet.id },
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [transactions, usageRows] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.walletTransaction.groupBy({
        by: ['service'],
        where: {
          walletId: wallet.id,
          type: 'charge',
          service: { not: null },
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
    ]);

    const monthlyUsage: Record<string, string> = {};

    for (const row of usageRows) {
      if (row.service) {
        monthlyUsage[row.service] = row._sum.amount?.toFixed(2) || '0.00';
      }
    }

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        balance: wallet.balance.toFixed(2),
        currency: wallet.currency,
      },
      autoTopUp: {
        enabled: autoTopUp.enabled,
        thresholdAmount: autoTopUp.thresholdAmount.toFixed(2),
        topUpAmount: autoTopUp.topUpAmount.toFixed(2),
        monthlyLimitAmount: autoTopUp.monthlyLimitAmount?.toFixed(2) ?? null,
        monthlyChargesLimit: autoTopUp.monthlyChargesLimit,
      },
      monthlyUsage,
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        service: transaction.service,
        amount: transaction.amount.toFixed(2),
        balanceAfter: transaction.balanceAfter.toFixed(2),
        description: transaction.description,
        createdAt: transaction.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to load wallet:', error);
    return NextResponse.json({ error: 'Failed to load wallet' }, { status: 500 });
  }
}
