import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-secret-2025';
const PRICING_SETTINGS_ID = 'global-pricing';

function isAdmin(request: NextRequest) {
  return request.headers.get('X-Admin-Password') === ADMIN_PASSWORD;
}

function decimalText(value: unknown, label: string, max: number) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0 || amount > max) {
    throw new Error(`${label} חייב להיות מספר בין 0 ל-${max}.`);
  }

  return amount.toFixed(2);
}

async function getPricing() {
  return prisma.pricingSettings.upsert({
    where: { id: PRICING_SETTINGS_ID },
    update: {},
    create: {
      id: PRICING_SETTINGS_ID,
      voiceAgentRetailPerMinute: '0.00',
      twilioPhoneRetailPerMinute: '0.00',
      voiceAgentEstimatedCostPerMinute: '0.00',
      twilioPhoneEstimatedCostPerMinute: '0.00',
      targetGrossMargin: '60.00',
      currency: 'ILS',
    },
  });
}

function serialize(pricing: Awaited<ReturnType<typeof getPricing>>) {
  return {
    voiceAgentRetailPerMinute: pricing.voiceAgentRetailPerMinute.toString(),
    twilioPhoneRetailPerMinute: pricing.twilioPhoneRetailPerMinute.toString(),
    voiceAgentEstimatedCostPerMinute: pricing.voiceAgentEstimatedCostPerMinute.toString(),
    twilioPhoneEstimatedCostPerMinute: pricing.twilioPhoneEstimatedCostPerMinute.toString(),
    targetGrossMargin: pricing.targetGrossMargin.toString(),
    currency: pricing.currency,
    updatedAt: pricing.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(serialize(await getPricing()));
  } catch (error) {
    console.error('GET admin pricing error:', error);
    return NextResponse.json({ error: 'לא ניתן לטעון תמחור.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'נתוני תמחור לא תקינים.' }, { status: 400 });
    }

    const data = {
      voiceAgentRetailPerMinute: decimalText(
        body.voiceAgentRetailPerMinute,
        'מחיר שיחת AI ללקוח',
        100000
      ),
      twilioPhoneRetailPerMinute: decimalText(
        body.twilioPhoneRetailPerMinute,
        'מחיר רכיב הטלפון Twilio ללקוח',
        100000
      ),
      voiceAgentEstimatedCostPerMinute: decimalText(
        body.voiceAgentEstimatedCostPerMinute,
        'עלות משוערת של שיחת AI',
        100000
      ),
      twilioPhoneEstimatedCostPerMinute: decimalText(
        body.twilioPhoneEstimatedCostPerMinute,
        'עלות משוערת של Twilio',
        100000
      ),
      targetGrossMargin: decimalText(
        body.targetGrossMargin,
        'יעד רווח גולמי',
        95
      ),
      currency: 'ILS',
    };

    const pricing = await prisma.pricingSettings.upsert({
      where: { id: PRICING_SETTINGS_ID },
      update: data,
      create: {
        id: PRICING_SETTINGS_ID,
        ...data,
      },
    });

    return NextResponse.json({
      success: true,
      pricing: serialize(pricing),
    });
  } catch (error) {
    console.error('PUT admin pricing error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'לא ניתן לשמור את התמחור.',
      },
      { status: 400 }
    );
  }
}
