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
export function formatAgent(agent: any) {
  return {
    id: agent.id,
    name: agent.name,
    number: agent.phoneNumber || '',
    purpose: agent.purpose || '',
    status: agent.status || 'waiting',
    tone: Array.isArray(agent.tone) ? agent.tone : [],
    startTime: agent.startTime || '',
    endTime: agent.endTime || '',
    scheduledAt: agent.scheduledAt || null,
    slug: agent.slug || ''
  };
}

/**
 * Generates OpenAI Realtime system instructions for an agent.
 */
export function getAgentInstructions(agent: any): string {
  const name = agent.name;
  const purpose = agent.purpose || 'Explain the system and answer user questions.';
  const toneString = Array.isArray(agent.tone) && agent.tone.length > 0
    ? agent.tone.join(', ')
    : 'professional and friendly';

  return `Your name is "${name}".
Your instructions and main purpose:
${purpose}

Your tone of voice should be: ${toneString}.
Please converse directly with the user. Answer in Hebrew or the language the user speaks. Be concise and natural as it is a voice call.`;
}
