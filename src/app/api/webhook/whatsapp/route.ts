import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'anino_verify_123';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Initialize OpenAI client if API key is present
const openai = OPENAI_API_KEY && OPENAI_API_KEY !== 'PUT_OPENAI_KEY_HERE' 
  ? new OpenAI({ apiKey: OPENAI_API_KEY }) 
  : null;

// GET method: Webhook verification by Meta
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode && token) {
      if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        console.log('WhatsApp webhook verified successfully.');
        return new NextResponse(challenge, { status: 200 });
      } else {
        console.warn('WhatsApp webhook verification failed. Token mismatch.');
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    return new NextResponse('Bad Request', { status: 400 });
  } catch (error) {
    console.error('Error in WhatsApp webhook verification:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST method: Receiving WhatsApp message updates from Meta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received WhatsApp webhook payload:', JSON.stringify(body, null, 2));

    // Check if it's a valid WhatsApp message event
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    // If there's no message object, it might be a status update or delivery receipt, which we ignore
    if (!message || message.type !== 'text') {
      return NextResponse.json({ success: true, message: 'No text message to process' }, { status: 200 });
    }

    const from = message.from; // Sender's WhatsApp number
    const messageText = message.text?.body; // Message body text
    const messageId = message.id; // Unique WhatsApp message ID

    if (!from || !messageText) {
      return NextResponse.json({ success: true, message: 'Invalid message structure' }, { status: 200 });
    }

    // Retrieve the Meta phone number ID that received the message
    const phoneId = value?.metadata?.phone_number_id;

    console.log(`Processing WhatsApp message from: ${from} to phoneId: ${phoneId}. Content: "${messageText}"`);

    // 1. Load matching Business Profile
    let businessProfile = null;
    if (phoneId) {
      businessProfile = await prisma.businessProfile.findFirst({
        where: { whatsappPhoneNumberId: phoneId }
      });
    }

    // Fallback: If not found, use the first business profile in database
    if (!businessProfile) {
      businessProfile = await prisma.businessProfile.findFirst();
    }

    if (!businessProfile) {
      console.warn('No BusinessProfile found in database. Unable to reply.');
      return NextResponse.json({ success: true, message: 'No business profile found' }, { status: 200 });
    }

    const userId = businessProfile.userId;
    const senderName = value?.contacts?.[0]?.profile?.name || null;

    // 2. Find or create Customer by phone number (Scoped per business owner/userId)
    const customer = await prisma.customer.upsert({
      where: {
        phone_userId: {
          phone: from,
          userId: userId
        }
      },
      update: senderName ? { name: senderName } : {},
      create: {
        phone: from,
        userId: userId,
        name: senderName || 'לקוח וואטסאפ',
      },
    });

    // 3. Save incoming message
    await prisma.message.create({
      data: {
        customerId: customer.id,
        sender: 'customer',
        text: messageText,
      },
    });

    // 4. Load recent conversation history (up to last 10 messages) to provide context for OpenAI
    const recentMessages = await prisma.message.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Reverse to chronological order for OpenAI context
    recentMessages.reverse();

    // Map database history to OpenAI messages format
    const chatHistory = recentMessages.map((msg) => ({
      role: msg.sender === 'customer' ? 'user' as const : 'assistant' as const,
      content: msg.text,
    }));

    // 5. Build OpenAI system prompt with business information
    const profileText = `
שם העסק: ${businessProfile.businessName}
סוג העסק: ${businessProfile.businessType}
תיאור העסק: ${businessProfile.description}
שעות פתיחה: ${businessProfile.openingHours}
כתובת: ${businessProfile.address}
אזורי משלוח: ${businessProfile.deliveryAreas}
טלפון: ${businessProfile.phone}
וואטסאפ: ${businessProfile.whatsappNumber}
תפריט/שירותים/מחירים: ${businessProfile.menuText}
שאלות ותשובות נפוצות (FAQ): ${businessProfile.faqText}
הנחיות מיוחדות לסוכן: ${businessProfile.agentInstructions}
`;

    const systemPrompt = `
אתה סוכן וואטסאפ של העסק. ענה קצר, ברור ובעברית פשוטה. השתמש רק במידע שקיים בפרופיל העסק. אל תמציא מחירים, שעות פתיחה, אזורי משלוח או שירותים. אם חסר מידע, תגיד: אני בודק ואחזור אליך. שאל שאלה אחת בכל פעם.

פרופיל העסק הנוכחי:
${profileText}
`;

    // 6. Generate AI response with OpenAI
    let replyText = 'אני בודק ואחזור אליך';

    if (openai) {
      try {
        const messagesForAI = [
          { role: 'system' as const, content: systemPrompt },
          ...chatHistory.slice(0, -1), // Everything except the message we just saved
          { role: 'user' as const, content: messageText }, // The current incoming message
        ];

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messagesForAI,
          temperature: 0.3,
        });

        const aiReply = completion.choices[0].message.content?.trim();
        if (aiReply) {
          replyText = aiReply;
        }
      } catch (openAiError) {
        console.error('Error invoking OpenAI Chat Completions:', openAiError);
        replyText = 'אני בודק ואחזור אליך';
      }
    } else {
      console.warn('OpenAI API key is missing or not configured. Replying with default fallback.');
    }

    // 7. Save AI Agent's response in the database
    await prisma.message.create({
      data: {
        customerId: customer.id,
        sender: 'agent',
        text: replyText,
      },
    });

    // 8. Send message via Meta WhatsApp Cloud API
    const whatsappToken = process.env.WHATSAPP_TOKEN;
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (whatsappToken && whatsappToken !== 'PUT_META_TOKEN_HERE' && whatsappPhoneId && whatsappPhoneId !== 'PUT_PHONE_NUMBER_ID_HERE') {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${whatsappPhoneId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${whatsappToken}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: from,
              type: 'text',
              text: {
                body: replyText,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error sending WhatsApp message via Meta Cloud API:', JSON.stringify(errorData, null, 2));
        } else {
          console.log(`WhatsApp message successfully sent back to ${from}`);
        }
      } catch (metaError) {
        console.error('Fetch error while sending WhatsApp message to Meta:', metaError);
      }
    } else {
      console.warn('Meta WhatsApp Cloud API credentials (WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID) are not configured. Unable to send reply.');
    }

    // Always respond with 200 OK to Meta
    return NextResponse.json({ success: true, reply: replyText }, { status: 200 });
  } catch (error) {
    console.error('Error in WhatsApp webhook processing:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 200 });
  }
}
