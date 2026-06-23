'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import './Hero.css';

const Hero: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  // Animation variants for coin animation (if any specific to Hero itself, otherwise remove if not used)
  // const itemVariants = { ... }; // Example if needed for coin or other elements

  return (
    <section id="home" className="hero">
      <div className="hero-overlay"></div>
      <div className="hero-content">
        {/* hero-text-container is removed from here */}
       
      </div>
      
      {!isAuthenticated && (
        <motion.div 
          className="scroll-indicator"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: 1.8, 
            duration: 0.8,
            ease: "easeOut" 
          }}
        >
          <div className="mouse">
            <div className="mouse-wheel"></div>
          </div>
          <div className="scroll-text">{t('hero.scroll', 'Scroll')}</div>
        </motion.div>
      )}
    </section>
  );
};

export default Hero;
