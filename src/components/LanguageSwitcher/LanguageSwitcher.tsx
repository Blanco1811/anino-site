"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FiGlobe } from 'react-icons/fi';
import { useLanguageSwitcher } from './useLanguageSwitcher';
import './LanguageSwitcher.css';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { isOpen, toggleDropdown, changeLanguage, languageOptions } = useLanguageSwitcher();

  return (
    <div className="language-switcher">
      <motion.button
        className="language-button"
        onClick={toggleDropdown}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiGlobe className="globe-icon" />
        <span className="current-lang">{i18n.language?.toUpperCase() || 'EN'}</span>
      </motion.button>

      {isOpen && (
        <motion.div 
          className="language-dropdown"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {languageOptions.map((lang) => (
            <motion.button
              key={lang.code}
              className={`language-option ${i18n.language === lang.code ? 'active' : ''}`}
              onClick={() => changeLanguage(lang.code)}
              whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              {lang.name}
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
