'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FiShield, FiUsers, FiEdit, FiEye } from 'react-icons/fi';
// useFeatures functionality is now directly in the component
import './Features.css';

const Features: React.FC = () => {
  const { t } = useTranslation();
  
  // Integrate useFeatures functionality directly
  const [isVisible, setIsVisible] = useState(false);
  const featuresRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the section becomes visible in the viewport
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once we've seen it, no need to keep observing
          if (featuresRef.current) {
            observer.unobserve(featuresRef.current);
          }
        }
      },
      {
        // Start animations when section is 20% visible
        threshold: 0.2,
        rootMargin: '0px'
      }
    );

    if (featuresRef.current) {
      observer.observe(featuresRef.current);
    }

    // Capture the ref value inside the effect to avoid stale ref in cleanup
    const currentRef = featuresRef.current;
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const featuresData = [
    {
      id: 'transparency',
      icon: <FiEye />,
      title: t('features.transparency.title'),
      description: t('features.transparency.description'),
      color: '#5AB9FE',
    },
    {
      id: 'rewards',
      icon: <FiEdit />,
      title: t('features.rewards.title'),
      description: t('features.rewards.description'),
      color: '#8F66FF',
    },
    {
      id: 'community',
      icon: <FiUsers />,
      title: t('features.community.title'),
      description: t('features.community.description'),
      color: '#6E8FFF',
    },
    {
      id: 'security',
      icon: <FiShield />,
      title: t('features.security.title'),
      description: t('features.security.description'),
      color: '#7B5AE0',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  return (
    <section id="features" className="features" ref={featuresRef}>
      <div className="container">
        <motion.div
          className="features-content"
          variants={containerVariants}
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
        >
          <motion.div className="features-header" variants={itemVariants}>
            <h2 className="section-title">{t('features.title')}</h2>
            <div className="section-divider"></div>
          </motion.div>

          <div className="features-grid">
            {featuresData.map((feature) => (
              <motion.div
                key={feature.id}
                className="feature-card"
                variants={itemVariants}
                whileHover={{ 
                  y: -10, 
                  boxShadow: `0 15px 30px rgba(0, 0, 0, 0.2), 0 0 0 1px ${feature.color}30` 
                }}
              >
                <div 
                  className="feature-icon"
                  style={{ backgroundColor: `${feature.color}20`, color: feature.color }}
                >
                  {feature.icon}
                  <div 
                    className="icon-bg" 
                    style={{ borderColor: feature.color }}
                  ></div>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div 
                  className="feature-accent" 
                  style={{ backgroundColor: feature.color }}
                ></div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
