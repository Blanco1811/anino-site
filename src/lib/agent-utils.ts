// Reserved slug names that cannot be registered by users
export const RESERVED_SLUGS = new Set([
  'api',
  'login',
  'register',
  'dashboard',
  'admin',
  'settings'
]);

// Hebrew special-case mapping dictionary for perfect matching of common names/words
const HEBREW_SPECIAL_CASES: { [key: string]: string } = {
  'קדמה': 'kadma',
  'אנינו': 'anino',
  'שלום': 'shalom',
  'עברית': 'ivrit'
};

/**
 * Converts any text (including Hebrew names) into a clean, URL-safe slug.
 */
export function slugify(text: string): string {
  if (!text) return '';

  const trimmed = text.trim().toLowerCase();

  // Check special cases dictionary first
  if (HEBREW_SPECIAL_CASES[trimmed]) {
    return HEBREW_SPECIAL_CASES[trimmed];
  }

  // Transliterate Hebrew letters to English characters
  const hebrewMap: { [key: string]: string } = {
    'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't',
    'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's',
    'ע': 'a', 'פ': 'f', 'ף': 'f', 'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't'
  };

  let transliterated = '';
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (hebrewMap[char] !== undefined) {
      // Special rule: final 'ה' is usually pronounced as 'a' in names
      if (char === 'ה' && i === trimmed.length - 1) {
        transliterated += 'a';
      } else {
        transliterated += hebrewMap[char];
      }
    } else {
      transliterated += char;
    }
  }

  return transliterated
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
    .replace(/\s+/g, '-')         // Replace spaces with -
    .replace(/-+/g, '-');         // Collapse multiple dashes
}

/**
 * Formats an agent object to the standard structure returned to the frontend.
 */
export function formatAgent(agent: any): any {
  return {
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    phoneNumber: agent.phoneNumber || '',
    purpose: agent.purpose || '',
    status: agent.status || 'waiting',
    tone: Array.isArray(agent.tone) ? agent.tone : [],
    startTime: agent.startTime || '',
    endTime: agent.endTime || '',
    scheduledAt: agent.scheduledAt || null,
    createdAt: agent.createdAt || null,
    updatedAt: agent.updatedAt || null,
    imageUrl: agent.imageUrl || '',
    greeting: agent.greeting || '',
    voiceGender: agent.voiceGender || 'neutral',
    voiceName: agent.voiceName || 'alloy',
    responseLength: agent.responseLength || 'normal',
    conversationStyle: agent.conversationStyle || 'professional',
  };
}

/**
 * Generates OpenAI Realtime system instructions for an agent.
 */

export function getAgentRealtimeVoice(agent: any): string {
  const allowed = new Set([
    'alloy',
    'ash',
    'ballad',
    'coral',
    'echo',
    'sage',
    'shimmer',
    'verse',
    'marin',
    'cedar',
  ]);

  const requested = String(agent?.voiceName || '').toLowerCase().trim();
  if (allowed.has(requested)) return requested;

  const gender = String(agent?.voiceGender || '').toLowerCase().trim();
  if (gender === 'male') return 'cedar';
  if (gender === 'female') return 'marin';

  return 'alloy';
}

export function getAgentInstructions(agent: any): string {
  const purpose = agent?.purpose || 'Explain the system and answer user questions.';
  const toneString = Array.isArray(agent?.tone) && agent.tone.length > 0
    ? agent.tone.join(', ')
    : 'professional, friendly';

  const greeting = agent?.greeting
    ? `Opening greeting: ${agent.greeting}`
    : 'Start every new voice conversation with a short friendly greeting, then wait for the user to speak.';

  const responseLengthMap: Record<string, string> = {
    short: 'Keep answers very short and direct.',
    normal: 'Keep answers natural and concise.',
    detailed: 'Give detailed answers when the user asks for details, but do not ramble.',
  };

  const styleMap: Record<string, string> = {
    professional: 'Speak professionally and clearly.',
    warm: 'Speak warmly, patiently, and in a human way.',
    sales: 'Speak in a helpful sales style, explain benefits, and guide the user toward the next step without pressure.',
    calm: 'Speak calmly, slowly, and reassuringly.',
  };

  const responseLength = responseLengthMap[agent?.responseLength || 'normal'] || responseLengthMap.normal;
  const conversationStyle = styleMap[agent?.conversationStyle || 'professional'] || styleMap.professional;

  return `You are an ANINO voice agent.

Your instructions and main purpose:
${purpose}

Tone tags:
${toneString}

${greeting}

${responseLength}
${conversationStyle}

Important language rule:
Answer in the same language the user speaks. If the user speaks Hebrew, answer in Hebrew. If the user switches language, switch with them.

Voice-call behavior:
Be natural, concise, and conversational. Do not say you are reading instructions. Ask short follow-up questions when needed.`;
}
