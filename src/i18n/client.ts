'use client';

import i18next from 'i18next';
import { initReactI18next as initReact } from 'react-i18next';

import en from './locales/en/translation.json';
import he from './locales/he/translation.json';

export const SUPPORTED_LANGUAGES = ['en', 'he'];

i18next
  .use(initReact)
  .init({
    lng: 'he', // default to Hebrew
    fallbackLng: 'he',
    ns: ['translation'],
    defaultNS: 'translation',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false
    },
    resources: {
      en: { translation: en },
      he: { translation: he }
    },
  });

export default i18next;
