import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type BillableCallType = 'browser' | 'twilio';

const PRICING_ID = 'global-pricing';

const pricingDefaults = {
  id: PRICING_ID,
  voiceAgentRetailPerMinute: '0.00',
  twilioPhoneRetailPerMinute: '0.00',
  voiceAgentEstimatedCostPerMinute: '0.00',
  twilioPhoneEstimatedCostPerMinute: '0.00',
  targetGrossMargin: '60.00',
  currency: 'ILS',
};

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

async function ensurePricing(client: PrismaClientLike) {
  return client.pricingSettings.upsert({
    where: { id: PRICING_ID },
    update: {},
    create: pricingDefaults,
  });
}

function toDecimal(value: unknown) {
  try {
    return new Prisma.Decimal(String(value ?? '0'));
  } catch {
    return new Prisma.Decimal(0);
  }
}

function roundMoney(value: Prisma.Decimal) {
  return new Prisma.Decimal(value.toFixed(2));
}

function formatMoney(value: Prisma.Decimal) {
  return value.toFixed(2);
}

function pricePerMinute(pricing: any, type: BillableCallType) {
  const ai = toDecimal(pricing.voiceAgentRetailPerMinute);
  const phone = toDecimal(pricing.twilioPhoneRetailPerMinute);
  return type === 'twilio' ? ai.plus(phone) : ai;
}

export async function ensureCallCanStart(
  userId: string,
  type: BillableCallType
) {
  const pricing = await ensurePricing(prisma);
  const required = pricePerMinute(pricing, type);

  if (required.lte(0)) {
    return {
      ok: false,
      error:
        'מחיר השיחה עדיין לא הוגדר. יש להגדיר תמחור באדמין לפני התחלת שיחה.',
      required: '0.00',
      balance: '0.00',
    };
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

  if (wallet.balance.lt(required)) {
    return {
      ok: false,
      error: `אין יתרה מספקת להתחלת שיחה. נדרשת יתרה של לפחות ₪${formatMoney(required)}.`,
      required: formatMoney(required),
      balance: formatMoney(wallet.balance),
    };
  }

  return {
    ok: true,
    required: formatMoney(required),
    balance: formatMoney(wallet.balance),
  };
}

export async function chargeCompletedCall(
  callId: string,
  type: BillableCallType,
  inputDurationSeconds: number
) {
  const durationSeconds = Math.max(
    0,
    Math.floor(Number(inputDurationSeconds) || 0)
  );

  if (durationSeconds <= 0) {
    return {
      charged: false,
      durationSeconds,
      amount: '0.00',
      reason: 'zero_duration',
    };
  }

  return prisma.$transaction(
    async (tx) => {
      const call = await tx.call.findUnique({
        where: { id: callId },
        include: {
          agent: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!call) {
        throw new Error('השיחה לא נמצאה לצורך חיוב.');
      }

      const pricing = await ensurePricing(tx);
      const minutes = new Prisma.Decimal(durationSeconds).dividedBy(60);

      const aiAmount = roundMoney(
        toDecimal(pricing.voiceAgentRetailPerMinute).times(minutes)
      );

      const phoneAmount = roundMoney(
        toDecimal(pricing.twilioPhoneRetailPerMinute).times(minutes)
      );

      const components: Array<{
        service: string;
        amount: Prisma.Decimal;
        description: string;
      }> = [];

      if (aiAmount.gt(0)) {
        components.push({
          service: 'voice_agent',
          amount: aiAmount,
          description:
            type === 'browser'
              ? `שיחת AI בדפדפן — ${durationSeconds} שניות`
              : `רכיב AI בשיחת טלפון — ${durationSeconds} שניות`,
        });
      }

      if (type === 'twilio' && phoneAmount.gt(0)) {
        components.push({
          service: 'phone_call',
          amount: phoneAmount,
          description: `רכיב טלפון Twilio — ${durationSeconds} שניות`,
        });
      }

      const total = components.reduce(
        (sum, item) => sum.plus(item.amount),
        new Prisma.Decimal(0)
      );

      if (components.length === 0 || total.lte(0)) {
        return {
          charged: false,
          durationSeconds,
          amount: '0.00',
          reason: 'zero_price',
        };
      }

      const referenceIds = components.map(
        (item) => `call:${call.id}:${item.service}`
      );

      const existingTransactions = await tx.walletTransaction.findMany({
        where: {
          referenceId: {
            in: referenceIds,
          },
        },
        select: {
          referenceId: true,
        },
      });

      const existingRefs = new Set(
        existingTransactions
          .map((item) => item.referenceId)
          .filter(Boolean)
      );

      if (existingRefs.size === referenceIds.length) {
        return {
          charged: true,
          alreadyCharged: true,
          durationSeconds,
          amount: formatMoney(total),
        };
      }

      if (existingRefs.size > 0) {
        throw new Error(
          'נמצא חיוב חלקי קודם לאותה שיחה. החיוב נעצר כדי למנוע חיוב כפול.'
        );
      }

      const wallet = await tx.wallet.upsert({
        where: { userId: call.agent.userId },
        update: {},
        create: {
          userId: call.agent.userId,
          balance: new Prisma.Decimal(0),
          currency: 'ILS',
        },
      });

      const initialBalance = new Prisma.Decimal(wallet.balance.toString());

      const walletUpdated = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          balance: {
            gte: total,
          },
        },
        data: {
          balance: {
            decrement: total,
          },
        },
      });

      if (walletUpdated.count !== 1) {
        await tx.call.update({
          where: { id: call.id },
          data: {
            errorMessage: `חיוב לא בוצע: יתרה לא מספקת עבור ₪${formatMoney(total)}.`,
          },
        });

        return {
          charged: false,
          insufficientFunds: true,
          durationSeconds,
          amount: formatMoney(total),
        };
      }

      let runningBalance = initialBalance;

      for (const component of components) {
        runningBalance = roundMoney(runningBalance.minus(component.amount));

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'charge',
            service: component.service,
            amount: component.amount,
            balanceAfter: runningBalance,
            description: component.description,
            referenceId: `call:${call.id}:${component.service}`,
          },
        });
      }

      return {
        charged: true,
        durationSeconds,
        billableMinutes: minutes.toFixed(4),
        amount: formatMoney(total),
        components: components.map((component) => ({
          service: component.service,
          amount: formatMoney(component.amount),
        })),
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

export async function reconcileLatestTwilioCallForUser(userId: string) {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();

  if (!accountSid || !authToken) {
    console.error('[twilio-wallet-sync] Missing Twilio credentials');
    return { found: false, reason: 'missing_credentials' };
  }

  const pendingCalls = await prisma.call.findMany({
    where: {
      direction: 'twilio',
      twilioSid: { not: null },
      status: {
        in: ['calling', 'queued', 'ringing', 'in_progress', 'in-progress'],
      },
    } as any,
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      agent: {
        select: {
          userId: true,
        },
      },
    },
  });

  const userCalls = pendingCalls.filter(
    (call) => call.agent?.userId === userId && call.twilioSid
  );

  if (userCalls.length === 0) {
    return { found: false, reason: 'no_pending_call' };
  }

  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const finalStatuses = new Set([
    'completed',
    'busy',
    'failed',
    'no-answer',
    'canceled',
  ]);

  let lastRemoteStatus = '';

  for (const call of userCalls) {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call.twilioSid}.json`,
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error(
        `[twilio-wallet-sync] Twilio lookup failed for ${call.twilioSid}: HTTP ${response.status}`
      );
      continue;
    }

    const remote = (await response.json()) as {
      status?: string | null;
      duration?: string | number | null;
    };

    const remoteStatus = String(remote.status || '').trim().toLowerCase();
    lastRemoteStatus = remoteStatus;

    if (!finalStatuses.has(remoteStatus)) {
      continue;
    }

    const durationSeconds = Math.max(
      0,
      Math.floor(Number(remote.duration || 0))
    );

    const updatedCall = await prisma.call.update({
      where: { id: call.id },
      data: {
        status: remoteStatus === 'in-progress' ? 'in_progress' : remoteStatus,
        endedAt: new Date(),
        durationSeconds,
      },
    });

    const billing =
      remoteStatus === 'completed' && durationSeconds > 0
        ? await chargeCompletedCall(updatedCall.id, 'twilio', durationSeconds)
        : null;

    return {
      found: true,
      synced: true,
      callId: updatedCall.id,
      remoteStatus,
      durationSeconds,
      billing,
    };
  }

  return {
    found: true,
    synced: false,
    remoteStatus: lastRemoteStatus || 'not_final',
  };
}
