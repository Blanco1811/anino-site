'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaWhatsapp } from 'react-icons/fa6';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import './Footer.css';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    if (pathname === '/' || pathname === '') {
      const element = document.getElementById(sectionId);
      if (element) {
        const offsetTop = element.offsetTop;
        window.scrollTo({
          top: offsetTop - 100, // Adjust for header height
          behavior: 'smooth'
        });
      }
    } else {
      router.push(`/#${sectionId}`);
    }
  }, [pathname, router]);

  const socialLinks = [
    { icon: <FaWhatsapp />, url: 'https://wa.me/972556888870?text=שלום%20אני%20מעוניין%20בסוכן%20AI', color: '#25D366' }
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-top">
            <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img 
                src="/logo.png" 
                alt="ANINO AI Logo" 
                style={{ height: '40px', width: 'auto', objectFit: 'contain' }} 
              />
              <span className="logo-coin" style={{ color: '#00D09C', fontWeight: 'bold', fontSize: '20px' }}>ANINO</span>
              <span className="logo-ai" style={{ color: '#ffffff', fontWeight: 'normal', marginLeft: '2px', fontSize: '20px' }}>AI</span>
            </div>
            
            <div className="footer-nav">
              <div className="footer-nav-column">
                <h3 className="footer-heading">{t('footer.links', 'ניווט מהיר')}</h3>
                <ul className="footer-links">
                  <li><button onClick={() => scrollToSection('features')}>{t('header.features', 'יכולות המערכת')}</button></li>
                  <li><button onClick={() => scrollToSection('about')}>{t('header.about', 'למי זה מתאים')}</button></li>
                </ul>
              </div>
              
              <div className="footer-nav-column">
                <h3 className="footer-heading">צור קשר</h3>
                <ul className="footer-links">
                  <li>וואטסאפ: 055-6888870</li>
                  <li>תמיכה ומכירות 24/7</li>
                </ul>
              </div>
              
              <div className="footer-nav-column">
                <h3 className="footer-heading">משפטי</h3>
                <ul className="footer-links">
                  <li><a href="/policies/terms-of-service">תנאי שימוש</a></li>
                  <li><a href="/policies/privacy-policy">מדיניות פרטיות</a></li>
                </ul>
              </div>
              
              <div className="footer-nav-column">
                <h3 className="footer-heading">התחברו אלינו</h3>
                <div className="footer-socials">
                  {socialLinks.map((link, index) => (
                    <motion.a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-icon"
                      style={{ color: link.color, borderColor: `${link.color}33`, backgroundColor: `${link.color}15` }}
                      whileHover={{ scale: 1.2, y: -5, backgroundColor: link.color, color: '#ffffff' }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {link.icon}
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p className="copyright" style={{ direction: 'rtl' }}>
              ANINO AI — סוכן שיווק ומענה לעסקים | וואטסאפ: 055-6888870 | © 2026 כל הזכויות שמורות.
            </p>
            <motion.button
              className="back-to-top"
              onClick={scrollToTop}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Back to top"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
