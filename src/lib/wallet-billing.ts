import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type TransactionClient = Prisma.TransactionClient;

export class WalletBillingError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'WalletBillingError';
  }
}

export function parseILSAmount(value: unknown, label: string): Prisma.Decimal {
  const text = String(value ?? '').trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new WalletBillingError(
      'INVALID_AMOUNT',
      400,
      `${label} חייב להיות סכום תקין עם עד שתי ספרות אחרי הנקודה`
    );
  }

  const amount = new Prisma.Decimal(text);

  if (amount.lte(0) || amount.gt(100000)) {
    throw new WalletBillingError(
      'INVALID_AMOUNT',
      400,
      `${label} חייב להיות בין 0.01 ל־100,000 ₪`
    );
  }

  return amount;
}

function cleanDescription(value: unknown, fallback: string) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return (text || fallback).slice(0, 240);
}

async function getWalletForUser(
  tx: TransactionClient,
  userId: string
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new WalletBillingError(
      'CUSTOMER_NOT_FOUND',
      404,
      'הלקוח לא נמצא'
    );
  }

  return tx.wallet.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      balance: new Prisma.Decimal(0),
      currency: 'ILS',
    },
  });
}

export async function topUpWallet(input: {
  userId: string;
  amount: Prisma.Decimal;
  description?: string;
  referenceId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const wallet = await getWalletForUser(tx, input.userId);

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: input.amount,
        },
      },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'topup',
        service: 'manual',
        amount: input.amount,
        balanceAfter: updatedWallet.balance,
        description: cleanDescription(
          input.description,
          'טעינה ידנית על ידי מנהל'
        ),
        referenceId: input.referenceId,
      },
    });

    return {
      transactionId: transaction.id,
      balance: updatedWallet.balance.toFixed(2),
    };
  });
}

export async function chargeWallet(input: {
  userId: string;
  service: string;
  amount: Prisma.Decimal;
  description?: string;
  referenceId: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const wallet = await getWalletForUser(tx, input.userId);

      const existing = await tx.walletTransaction.findUnique({
        where: { referenceId: input.referenceId },
      });

      if (existing) {
        const isSameCharge =
          existing.walletId === wallet.id &&
          existing.type === 'charge' &&
          existing.service === input.service &&
          existing.amount.eq(input.amount);

        if (!isSameCharge) {
          throw new WalletBillingError(
            'REFERENCE_CONFLICT',
            409,
            'מזהה הפעולה כבר קיים עבור חיוב אחר'
          );
        }

        return {
          alreadyProcessed: true,
          transactionId: existing.id,
          balance: existing.balanceAfter.toFixed(2),
        };
      }

      const updatedCount = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          balance: {
            gte: input.amount,
          },
        },
        data: {
          balance: {
            decrement: input.amount,
          },
        },
      });

      if (updatedCount.count !== 1) {
        throw new WalletBillingError(
          'INSUFFICIENT_BALANCE',
          402,
          'אין יתרה מספקת'
        );
      }

      const updatedWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { balance: true },
      });

      if (!updatedWallet) {
        throw new WalletBillingError(
          'WALLET_NOT_FOUND',
          500,
          'הארנק לא נמצא לאחר החיוב'
        );
      }

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'charge',
          service: input.service,
          amount: input.amount,
          balanceAfter: updatedWallet.balance,
          description: cleanDescription(
            input.description,
            `חיוב ${input.service}`
          ),
          referenceId: input.referenceId,
        },
      });

      return {
        alreadyProcessed: false,
        transactionId: transaction.id,
        balance: updatedWallet.balance.toFixed(2),
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.walletTransaction.findUnique({
        where: { referenceId: input.referenceId },
      });

      if (
        existing &&
        existing.type === 'charge' &&
        existing.service === input.service &&
        existing.amount.eq(input.amount)
      ) {
        return {
          alreadyProcessed: true,
          transactionId: existing.id,
          balance: existing.balanceAfter.toFixed(2),
        };
      }
    }

    throw error;
  }
}
