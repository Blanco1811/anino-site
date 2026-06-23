'use client';

import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { SUPPORTED_LANGUAGES } from '@/i18n/client';

interface LanguageProviderProps {
  children: React.ReactNode;
}

const RTL_LANGUAGES = ['he', 'ar'];

/**
 * Detects the best language from the browser.
 * Checks localStorage first (user's previous choice), then navigator.languages.
 */
function detectBrowserLanguage(): string {
  // Check if user has a saved preference
  const saved = localStorage.getItem('preferredLanguage');
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
    return saved;
  }

  // Detect from browser's language settings
  const browserLangs = navigator.languages || [navigator.language];
  for (const lang of browserLangs) {
    const code = lang.split('-')[0]; // "en-US" → "en"
    if (SUPPORTED_LANGUAGES.includes(code)) {
      return code;
    }
  }

  return 'en';
}

const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  useEffect(() => {
    // Detect browser language AFTER hydration to avoid mismatch
    const detected = detectBrowserLanguage();

    const applyLanguage = (lng: string) => {
      const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
      document.documentElement.dir = dir;
      document.documentElement.lang = lng;
    };

    if (detected !== i18n.language) {
      i18n.changeLanguage(detected);
    }
    applyLanguage(detected);

    // Listen for future language changes (e.g. from LanguageSwitcher)
    i18n.on('languageChanged', (lng) => {
      applyLanguage(lng);
      localStorage.setItem('preferredLanguage', lng);
    });

    return () => {
      i18n.off('languageChanged');
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
};

export default LanguageProvider;
