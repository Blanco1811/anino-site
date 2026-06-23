"use client";

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageOption {
  code: string;
  name: string;
}

export const useLanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languageOptions: LanguageOption[] = [
    { code: 'en', name: 'English' },
    { code: 'he', name: 'עברית' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ru', name: 'Русский' }
  ];

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const changeLanguage = useCallback((langCode: string) => {
    // LanguageProvider handles dir, lang attr, and localStorage on languageChanged
    i18n.changeLanguage(langCode);
    closeDropdown();
  }, [i18n, closeDropdown]);

  return {
    isOpen,
    toggleDropdown,
    closeDropdown,
    changeLanguage,
    languageOptions
  };
};
