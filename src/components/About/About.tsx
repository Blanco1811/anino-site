"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAbout } from './useAbout';
import './About.css';

const About: React.FC = () => {
  const { t } = useTranslation();
  const { isVisible, aboutRef } = useAbout();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        duration: 0.8
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <section id="about" className="about" ref={aboutRef}>
      <div className="container">
        <motion.div
          className="about-content"
          variants={containerVariants}
          initial="hidden"
          animate={isVisible ? "visible" : "hidden"}
        >
          <motion.div className="about-header" variants={itemVariants}>
            <h2 className="section-title">{t('about.title')}</h2>
          </motion.div>

          <motion.div className="about-grid" variants={itemVariants}>
            <div className="about-image">
              <div className="image-container">
                <div className="stock-image-wrapper">
                  <img 
                    src="/about.jpg" 
                    alt="About ANINO AI" 
                    className="about-stock-image"
                  />
                  <div className="image-overlay"></div>
                  <div className="value-tags">
                    <span className="value-tag security">{t('about.valueTags.security', 'Security')}</span>
                    <span className="value-tag trust">{t('about.valueTags.trust', 'Trust')}</span>
                    <span className="value-tag innovation">{t('about.valueTags.innovation', 'Innovation')}</span>
                    <span className="value-tag community">{t('about.valueTags.community', 'Community')}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="about-text">
              <motion.p className="about-description" variants={itemVariants}>
                {t('about.description')}
              </motion.p>
              
              <motion.div className="about-mission" variants={itemVariants}>
                <h3>{t('about.missionTitle')}</h3>
                <p>{t('about.mission')}</p>
              </motion.div>
              
              <motion.div className="about-vision" variants={itemVariants}>
                <h3>{t('about.visionTitle')}</h3>
                <p>{t('about.vision')}</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default About;
