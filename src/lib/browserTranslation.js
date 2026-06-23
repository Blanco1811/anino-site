function normalizeLanguage(language) {
  if (!language || typeof language !== 'string') return 'en';
  return language.split('-')[0].toLowerCase();
}

export function getPreferredBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en';

  const preferred = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return normalizeLanguage(preferred);
}

function detectSourceLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';

  // Hebrew block
  if (/[\u0590-\u05FF]/.test(text)) return 'he';
  // Cyrillic block
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';

  return 'en';
}

const translatorCache = new Map();

export function isBrowserTranslatorSupported() {
  const translatorApi = typeof globalThis !== 'undefined' ? globalThis.Translator : undefined;
  return !!(
    translatorApi &&
    typeof translatorApi.availability === 'function' &&
    typeof translatorApi.create === 'function'
  );
}

async function getTranslator(sourceLanguage, targetLanguage) {
  const source = normalizeLanguage(sourceLanguage);
  const target = normalizeLanguage(targetLanguage);

  if (source === target) return null;

  const cacheKey = `${source}->${target}`;
  if (translatorCache.has(cacheKey)) {
    return translatorCache.get(cacheKey);
  }

  const translatorApi = typeof globalThis !== 'undefined' ? globalThis.Translator : undefined;
  if (!translatorApi || typeof translatorApi.availability !== 'function' || typeof translatorApi.create !== 'function') {
    translatorCache.set(cacheKey, null);
    return null;
  }

  try {
    const availability = await translatorApi.availability({
      sourceLanguage: source,
      targetLanguage: target,
    });

    if (availability === 'unavailable') {
      translatorCache.set(cacheKey, null);
      return null;
    }

    const translator = await translatorApi.create({
      sourceLanguage: source,
      targetLanguage: target,
    });

    translatorCache.set(cacheKey, translator);
    return translator;
  } catch (error) {
    console.warn('Translator API unavailable for language pair:', source, target, error);
    translatorCache.set(cacheKey, null);
    return null;
  }
}

export async function translateWithBrowserApi(text, targetLanguage, options = {}) {
  if (!text || typeof text !== 'string') return text;

  const target = normalizeLanguage(targetLanguage);
  const source = detectSourceLanguage(text);

  if (source === target) return text;

  const translator = await getTranslator(source, target);
  if (!translator || typeof translator.translate !== 'function') {
    if (options.strict) {
      throw new Error('TRANSLATOR_UNAVAILABLE');
    }
    return text;
  }

  try {
    return await translator.translate(text);
  } catch (error) {
    console.warn('Translation failed, returning source text:', error);
    if (options.strict) {
      throw error;
    }
    return text;
  }
}

export async function translateBatchWithServerApi(texts, targetLanguage, sourceLanguage) {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts,
        targetLanguage,
        sourceLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server translation failed: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data?.translations)) {
      throw new Error('Invalid translation payload');
    }

    return data.translations;
  } catch (error) {
    console.warn('Server translation fallback failed:', error);
    return texts;
  }
}
