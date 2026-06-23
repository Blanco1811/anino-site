'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FiArrowRight, FiUserPlus, FiLogIn } from 'react-icons/fi';
// CTA functionality integrated directly into component
import RegistrationForm from '../RegistrationForm/RegistrationForm';
import LoginForm from '../LoginForm/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import './CTA.css';

const CTA: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  
  // Integrated CTA hook functionality
  const [isVisible, setIsVisible] = useState(false);
  const ctaRef = useRef<HTMLElement | null>(null);
  
  // Generate consistent particle positions for SSR/client consistency
  const [particleData, setParticleData] = useState<Array<{
    top: number;
    left: number;
    animationDelay: number;
    animationDuration: number;
  }>>([]);

  // State for form visibility and active form type
  const [activeForm, setActiveForm] = useState<'none' | 'register' | 'login'>('none');
  
  // Function to handle join button click
  const handleJoinClick = useCallback(() => {
    // If no form is visible, show the registration form
    // If a form is already visible, hide it
    setActiveForm(prev => prev === 'none' ? 'register' : 'none');
  }, []);
  
  // Function to switch between forms
  const switchToRegister = useCallback(() => {
    setActiveForm('register');
  }, []);
  
  const switchToLogin = useCallback(() => {
    setActiveForm('login');
  }, []);
  
  // Function to handle successful login
  const handleLoginSuccess = useCallback(() => {
    // Here you could redirect the user or update UI state
    setActiveForm('none');
  }, []);

  // Generate particle data on client-side only
  useEffect(() => {
    const particles = Array.from({ length: 20 }).map(() => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      animationDelay: Math.random() * 5,
      animationDuration: 5 + Math.random() * 10
    }));
    setParticleData(particles);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the section becomes visible in the viewport
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once we've seen it, no need to keep observing
          if (ctaRef.current) {
            observer.unobserve(ctaRef.current);
          }
        }
      },
      {
        // Start animations when section is 20% visible
        threshold: 0.2,
        rootMargin: '0px'
      }
    );

    if (ctaRef.current) {
      observer.observe(ctaRef.current);
    }

    // Capture the ref value inside the effect to avoid stale ref in cleanup
    const currentRef = ctaRef.current;
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  // If the user is authenticated, don't render the CTA component at all
  if (isAuthenticated) {
    return null;
  }
  
  // Only render the CTA component if the user is not authenticated
  return (
    <section id="cta" className="cta" ref={ctaRef}>
      <div className="cta-container">
        <motion.div
          className="cta-content"
          initial={{ opacity: 0, y: 50 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.7 }}
        >
          {/* Form Container */}
          <div className="form-container">
            {/* Inline Registration Form */}
            <RegistrationForm 
              isVisible={activeForm === 'register'} 
            />
            
            {/* Inline Login Form */}
            <LoginForm 
              isVisible={activeForm === 'login'} 
              onLoginSuccess={handleLoginSuccess}
              onRegisterClick={switchToRegister}
            />
          </div>
          
          {/* Form Toggle Buttons - only show when a form is visible */}
          {activeForm !== 'none' && (
            <div className="form-toggle-buttons">
              <button 
                className={`toggle-button ${activeForm === 'register' ? 'active' : ''}`}
                onClick={switchToRegister}
              >
                <FiUserPlus />
                {t('cta.register')}
              </button>
              <button 
                className={`toggle-button ${activeForm === 'login' ? 'active' : ''}`}
                onClick={switchToLogin}
              >
                <FiLogIn />
                {t('cta.login')}
              </button>
            </div>
          )}
          <motion.h2 
            className="cta-title"
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {t('cta.title')}
          </motion.h2>
          
          <motion.p 
            className="cta-description"
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {t('cta.description')}
          </motion.p>
          
          <motion.div 
            className="cta-buttons"
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <motion.a
              className="cta-join-button"
              href="https://wa.me/972556888870?text=שלום%20אני%20מעוניין%20בסוכן%20AI"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366' }}
            >
              {t('cta.button')}
              <FiArrowRight className="arrow-icon" style={{ marginRight: '8px', transform: 'rotate(180deg)' }} />
            </motion.a>

            <motion.button
              className="cta-join-button"
              onClick={handleJoinClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ backgroundColor: '#00D09C' }}
            >
              {activeForm !== 'none' ? t('cta.hideForms') : t('cta.register')}
            </motion.button>
          </motion.div>
        </motion.div>
        
        <div className="cta-background">
          <div className="cta-bg-shape shape-1"></div>
          <div className="cta-bg-shape shape-2"></div>
          <div className="cta-bg-shape shape-3"></div>
          <div className="cta-particles">
            {particleData.map((particle, index) => (
              <div 
                key={index} 
                className="particle"
                style={{
                  top: `${particle.top}%`,
                  left: `${particle.left}%`,
                  animationDelay: `${particle.animationDelay}s`,
                  animationDuration: `${particle.animationDuration}s`
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
