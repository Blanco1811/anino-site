import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getRequestUserId } from '@/lib/request-user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseMoney(value: unknown, label: string): Prisma.Decimal {
  const text = String(value ?? '').trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new Error(`${label} must be a valid amount`);
  }

  const amount = new Prisma.Decimal(text);

  if (amount.lte(0) || amount.gt(100000)) {
    throw new Error(`${label} is outside the allowed range`);
  }

  return amount;
}

export async function PUT(request: NextRequest) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const thresholdAmount = parseMoney(body.thresholdAmount, 'Threshold');
    const topUpAmount = parseMoney(body.topUpAmount, 'Top up amount');

    const monthlyLimitAmount =
      body.monthlyLimitAmount === null || body.monthlyLimitAmount === ''
        ? null
        : parseMoney(body.monthlyLimitAmount, 'Monthly limit');

    const monthlyChargesLimit =
      body.monthlyChargesLimit === null || body.monthlyChargesLimit === ''
        ? null
        : Number(body.monthlyChargesLimit);

    if (
      monthlyChargesLimit !== null &&
      (!Number.isInteger(monthlyChargesLimit) ||
        monthlyChargesLimit < 1 ||
        monthlyChargesLimit > 50)
    ) {
      return NextResponse.json(
        { error: 'Monthly charge limit must be a whole number between 1 and 50' },
        { status: 400 }
      );
    }

    if (monthlyLimitAmount && monthlyLimitAmount.lt(topUpAmount)) {
      return NextResponse.json(
        { error: 'Monthly limit cannot be lower than the top up amount' },
        { status: 400 }
      );
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

    const settings = await prisma.autoTopUpSettings.upsert({
      where: { walletId: wallet.id },
      update: {
        enabled: false,
        thresholdAmount,
        topUpAmount,
        monthlyLimitAmount,
        monthlyChargesLimit,
      },
      create: {
        walletId: wallet.id,
        enabled: false,
        thresholdAmount,
        topUpAmount,
        monthlyLimitAmount,
        monthlyChargesLimit,
      },
    });

    return NextResponse.json({
      message: 'Auto top-up preferences saved. Activation requires a tokenized Tranzila payment method.',
      autoTopUp: {
        enabled: settings.enabled,
        thresholdAmount: settings.thresholdAmount.toFixed(2),
        topUpAmount: settings.topUpAmount.toFixed(2),
        monthlyLimitAmount: settings.monthlyLimitAmount?.toFixed(2) ?? null,
        monthlyChargesLimit: settings.monthlyChargesLimit,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
