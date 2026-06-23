'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FiArrowRight, FiMessageCircle, FiPhoneCall, FiMail, FiUsers } from 'react-icons/fi';
import './HomeShowcase.css';

const HomeShowcase: React.FC = () => {
  const { t } = useTranslation();

  const services = [
    {
      id: 'whatsapp',
      title: t('features.transparency.title', 'סוכן WhatsApp AI לעסקים'),
      desc: t('features.transparency.description', 'עונה מיידית ללקוחות בוואטסאפ, מספק מידע על שירותים ומחירים, עונה על שאלות נפוצות ומתאם פגישות ביומן באופן אוטומטי לחלוטין.'),
      icon: <FiMessageCircle style={{ color: '#25D366' }} />
    },
    {
      id: 'voice',
      title: t('features.rewards.title', 'סוכן שיחות AI קולי'),
      desc: t('features.rewards.description', 'עונה לשיחות נכנסות של לקוחות ומבצע שיחות יוצאות (למשל, לחזור ללידים שהשאירו פרטים), קובע תורים ומסווג פניות ברמת שיחה אנושית.'),
      icon: <FiPhoneCall style={{ color: '#00D09C' }} />
    },
    {
      id: 'marketing',
      title: t('features.community.title', 'קמפיינים ושיווק רב-ערוצי'),
      desc: t('features.community.description', 'שליחת הודעות דיוור בוואטסאפ ללקוחות שאישרו קבלת הודעות, שליחת קמפיינים במייל, ואוטומציות שיווק ברשתות חברתיות (פייסבוק, אינסטגרם).'),
      icon: <FiMail style={{ color: '#FFb000' }} />
    },
    {
      id: 'leads',
      title: t('features.security.title', 'ניהול לידים ויתרה נטענת'),
      desc: t('features.security.description', 'מערכת CRM פשוטה לניהול הלידים והפניות שהסוכן אוסף. החיוב מתבצע מתוך יתרה נטענת מראש, המשתנה לפי היקף השימוש בפועל בהודעות או דקות שיחה.'),
      icon: <FiUsers style={{ color: '#0A66C2' }} />
    }
  ];

  const handleScrollToCTA = () => {
    const element = document.getElementById('cta');
    if (element) {
      const offsetTop = element.offsetTop;
      window.scrollTo({
        top: offsetTop - 100,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="home-showcase-section" id="home">
      <div className="container animate-fadeIn">
        {/* Main Hero Header */}
        <div className="home-showcase-header" style={{ textAlign: 'center', marginBottom: '48px', paddingTop: '40px' }}>
          <motion.span 
            className="home-showcase-badge"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{ backgroundColor: '#00D09C15', color: '#00D09C', padding: '6px 16px', borderRadius: '50px', fontSize: '14px', fontWeight: 'bold' }}
          >
            {t('hero.title', 'ANINO AI')}
          </motion.span>
          
          <motion.h1 
            className="home-showcase-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontSize: '2.8rem', fontWeight: 'bold', marginTop: '16px', marginBottom: '24px', lineHeight: '1.2' }}
          >
            {t('hero.slogan', 'סוכן AI שמביא לקוחות ומנהל פניות לעסק 24/7')}
          </motion.h1>
          
          <motion.p 
            className="home-showcase-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontSize: '1.25rem', color: '#b0b0b0', maxWidth: '800px', margin: '0 auto 40px auto', lineHeight: '1.6' }}
          >
            {t('hero.subtitle', 'מערכת AI לעסקים שעונה בוואטסאפ, מקבלת ומוציאה שיחות, חוזרת ללידים, שולחת מיילים ומנהלת קמפיינים ברשתות.')}
          </motion.p>

          {/* Action Buttons */}
          <motion.div 
            className="hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '60px' }}
          >
            <motion.a
              href="/agent"
              className="cta-join-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00D09C', color: '#fff', padding: '14px 28px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 14px rgba(0,208,156,0.3)' }}
            >
              <span style={{ marginLeft: '8px' }}>🤖</span>
              {t('cta.talkToAgent', 'דברו עם הסוכן')}
            </motion.a>

            <motion.a
              href="https://wa.me/972556888870?text=שלום%20אני%20מעוניין%20בסוכן%20AI"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-join-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', color: '#fff', padding: '14px 28px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 14px rgba(37,211,102,0.3)' }}
            >
              <FiMessageCircle style={{ marginLeft: '8px', fontSize: '20px' }} />
              {t('cta.button', 'קבלו דמו בוואטסאפ')}
            </motion.a>

            <motion.button
              onClick={handleScrollToCTA}
              className="cta-join-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', padding: '14px 28px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
            >
              {t('cta.register', 'התחילו ניסיון')}
              <FiArrowRight style={{ marginRight: '8px', transform: 'rotate(180deg)' }} />
            </motion.button>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <div className="home-showcase-grid">
          {services.map((service, index) => (
            <motion.article
              key={service.id}
              className="home-showcase-card"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.08 + 0.4 }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden' }}
            >
              <div className="home-showcase-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="home-showcase-label" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#00D09C', fontWeight: 'bold' }}>ANINO SERVICE</span>
                <span style={{ fontSize: '24px' }}>{service.icon}</span>
              </div>
              <h3 className="home-showcase-card-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '12px' }}>{service.title}</h3>
              <p className="home-showcase-card-content" style={{ color: '#a0a0a0', fontSize: '0.95rem', lineHeight: '1.6' }}>{service.desc}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeShowcase;
