'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FiMessageSquare, FiPhoneCall, FiSend, FiMail, FiShare2, FiUsers, FiDollarSign } from 'react-icons/fi';
import './ServiceSections.css';

const ServiceSections: React.FC = () => {
  const { t } = useTranslation();

  const servicesList = [
    {
      id: 'whatsapp-ai',
      icon: <FiMessageSquare />,
      color: '#25D366',
      title: 'סוכן WhatsApp AI',
      subtitle: 'מענה אוטומטי ומיידי לכל לקוח',
      description: 'סוכן ה-AI עונה ללקוחות שלכם בוואטסאפ בתוך שניות, 24 שעות ביממה. הוא מספק מידע מדויק על שירותים, מחירים ותפריטים, עונה על שאלות נפוצות מתוך מאגר הידע של העסק, ואפילו יודע לתאם פגישות ביומן באופן עצמאי לחלוטין.',
      benefits: ['זמינות מלאה 24/7 ללא הפסקה', 'מענה מיידי לשיפור חווית הלקוח', 'תזמון פגישות וסגירת תורים אוטומטית']
    },
    {
      id: 'voice-ai',
      icon: <FiPhoneCall />,
      color: '#00D09C',
      title: 'סוכן שיחות AI קולי',
      description: 'הסוכן הקולי החכם שלנו מסוגל לענות לשיחות נכנסות של לקוחות (כמו מענה לטלפון בעסק) או להוציא שיחות יזומות (למשל, לחזור ללידים חמים שהשאירו פרטים). השיחה מתנהלת בשפה טבעית ורהוטה, עם זיהוי כוונת הלקוח ואיסוף פרטים.',
      benefits: ['מענה אנושי וקול טבעי ורהוט', 'חזרה אוטומטית ללידים תוך שניות', 'סינון והכשרת לידים לפני העברה לעסק']
    },
    {
      id: 'whatsapp-marketing',
      icon: <FiSend />,
      color: '#34B7F1',
      title: 'שיווק בוואטסאפ',
      description: 'שלחו קמפיינים שיווקיים והודעות דיוור ממוקדות ישירות לוואטסאפ של לקוחות קיימים שאישרו קבלת הודעות מהעסק. מערכת הדיוור מותאמת אישית, שומרת על אחוזי פתיחה מטורפים של מעל 95% ומניעה לקוחות לפעולה חוזרת.',
      benefits: ['אחוזי פתיחה מהגבוהים בשוק', 'שליחה מותאמת אישית עם שם הלקוח', 'הנעה ישירה לביצוע רכישה או תיאום']
    },
    {
      id: 'email-marketing',
      icon: <FiMail />,
      color: '#FF8A65',
      title: 'שיווק במייל',
      description: 'נהלו קשר שוטף עם הלקוחות שלכם באמצעות קמפיינים מעוצבים במייל. שלחו ניוזלטרים, עדכונים, מבצעים מיוחדים והצעות ערך שישמרו את העסק שלכם תמיד בראש סדר העדיפויות של הלקוחות.',
      benefits: ['בניית קשר ארוך טווח עם הלקוחות', 'אוטומציות מייל חכמות (יום הולדת, נטישת עגלה)', 'דוחות ביצועים ואחוזי הקלקה מפורטים']
    },
    {
      id: 'social-marketing',
      icon: <FiShare2 />,
      color: '#EA4335',
      title: 'שיווק ברשתות',
      description: 'חברו את סוכני ה-AI לעמוד הפייסבוק והאינסטגרם של העסק. המערכת תגיב אוטומטית לתגובות של לקוחות בפוסטים, תשלח להם הודעות פרטיות (DM) מיידיות עם קישורים רלוונטיים, ותהפוך עוקבים ללידים חמים.',
      benefits: ['הפיכת עוקבים ברשתות ללקוחות משלמים', 'מענה אוטומטי ומיידי לתגובות והודעות פרטיות', 'שיפור החשיפה והמעורבות בעמודים']
    },
    {
      id: 'leads',
      icon: <FiUsers />,
      color: '#0A66C2',
      title: 'ניהול לידים ופניות',
      description: 'כל הלידים, הפניות והמידע שנאסף על ידי סוכני ה-AI בוואטסאפ, בשיחות וברשתות, מרוכזים במערכת CRM פשוטה ונוחה לשימוש. תוכלו לעקוב אחר סטטוס הטיפול בכל לקוח, להוסיף תגיות, ולדעת בדיוק מאיפה הגיע כל ליד.',
      benefits: ['ריכוז כל הפניות במקום אחד מסודר', 'סינון לידים מתקדם ומעקב סטטוסים', 'התראות מיידיות לנייד על לידים חדשים']
    },
    {
      id: 'balance',
      icon: <FiDollarSign />,
      color: '#9C52FD',
      title: 'מערכת יתרה נטענת',
      description: 'ב-ANINO אין דמי מנוי חודשיים קבועים ויקרים. אתם מטעינים את יתרת החשבון מראש לפי התקציב שלכם, והמערכת מנכה ממנה סכומים קטנים רק עבור שימוש בפועל: עלות קטנה לכל הודעת וואטסאפ שנשלחת או לכל דקת שיחה קולית שמבוצעת.',
      benefits: ['שליטה מלאה בתקציב ללא הפתעות', 'חיוב הוגן לפי שימוש בפועל בלבד', 'אין התחייבות לטווח ארוך או מנוי קבוע']
    }
  ];

  return (
    <div className="service-sections-container">
      {servicesList.map((service, index) => {
        const isEven = index % 2 === 0;
        return (
          <section 
            key={service.id} 
            id={service.id} 
            className="service-detail-section"
            style={{ 
              backgroundColor: isEven ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.05)',
              borderTop: '1px solid rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.02)'
            }}
          >
            <div className="container">
              <div className={`service-layout ${isEven ? 'normal' : 'reverse'}`}>
                
                {/* Text Content */}
                <motion.div 
                  className="service-text-side"
                  initial={{ opacity: 0, x: isEven ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6 }}
                >
                  <div 
                    className="service-icon-box"
                    style={{ backgroundColor: `${service.color}15`, color: service.color }}
                  >
                    {service.icon}
                  </div>
                  <h2 className="service-detail-title">{service.title}</h2>
                  {service.subtitle && <h3 className="service-detail-subtitle">{service.subtitle}</h3>}
                  <p className="service-detail-description">{service.description}</p>
                  
                  {service.benefits && (
                    <ul className="service-benefits-list">
                      {service.benefits.map((benefit, i) => (
                        <li key={i}>
                          <span className="benefit-bullet" style={{ backgroundColor: service.color }}></span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  )}

                  {service.id === 'whatsapp-ai' && (
                    <motion.a
                      href="/agent"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="service-action-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '24px',
                        backgroundColor: service.color,
                        color: '#fff',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        textDecoration: 'none',
                        fontSize: '15px',
                        boxShadow: `0 4px 14px ${service.color}25`
                      }}
                    >
                      הדגמת סוכן WhatsApp
                    </motion.a>
                  )}

                  {service.id === 'voice-ai' && (
                    <motion.a
                      href="/agent"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="service-action-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '24px',
                        backgroundColor: service.color,
                        color: '#fff',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        textDecoration: 'none',
                        fontSize: '15px',
                        boxShadow: `0 4px 14px ${service.color}25`
                      }}
                    >
                      כניסה לסוכן השיחות
                    </motion.a>
                  )}

                  {service.id === 'social-marketing' && (
                    <motion.a
                      href="https://marketing.staging.anino-ai.com"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="service-action-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '24px',
                        backgroundColor: service.color,
                        color: '#fff',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        textDecoration: 'none',
                        fontSize: '15px',
                        boxShadow: `0 4px 14px ${service.color}25`
                      }}
                    >
                      כניסה
                    </motion.a>
                  )}
                </motion.div>

                {/* Decorative Visual Side */}
                <motion.div 
                  className="service-visual-side"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <div className="visual-mockup-card" style={{ borderColor: `${service.color}20` }}>
                    <div className="mockup-header" style={{ borderBottomColor: `${service.color}15` }}>
                      <span className="mockup-dot red"></span>
                      <span className="mockup-dot yellow"></span>
                      <span className="mockup-dot green"></span>
                      <span className="mockup-title">{service.title} - Simulator</span>
                    </div>
                    <div className="mockup-body">
                      {/* Simulate a chat/call/leads interface depending on the service */}
                      {service.id === 'whatsapp-ai' && (
                        <div className="chat-simulation">
                          <div className="chat-msg user">שלום, רציתי לדעת מה שעות הפעילות שלכם והאם יש לכם משלוחים?</div>
                          <div className="chat-msg bot" style={{ borderLeftColor: service.color }}>היי! שעות הפעילות שלנו הן בימים א-ה בין 09:00 ל-22:00, ובימי שישי עד 15:00. לגבי משלוחים - כן! אנו עושים משלוחים לכל אזור גוש דן. תרצה שאעזור לך להזמין? 🛵</div>
                        </div>
                      )}
                      {service.id === 'voice-ai' && (
                        <div className="call-simulation">
                          <div className="call-status">
                            <span className="pulse-dot" style={{ backgroundColor: service.color }}></span>
                            שיחה קולית פעילה ב-AI...
                          </div>
                          <div className="call-waveform">
                            <span className="bar wave-1" style={{ backgroundColor: service.color }}></span>
                            <span className="bar wave-2" style={{ backgroundColor: service.color }}></span>
                            <span className="bar wave-3" style={{ backgroundColor: service.color }}></span>
                            <span className="bar wave-4" style={{ backgroundColor: service.color }}></span>
                          </div>
                          <div className="call-text">"נשמע מצוין, תרשום אותי לפגישת ייעוץ למחר ב-10:00"</div>
                        </div>
                      )}
                      {service.id.includes('marketing') && (
                        <div className="marketing-simulation">
                          <div className="stat-row">
                            <span className="stat-label">קמפיין פעיל:</span>
                            <span className="stat-val active">רץ כעת</span>
                          </div>
                          <div className="stat-progress-bar">
                            <div className="progress-fill" style={{ backgroundColor: service.color, width: '84%' }}></div>
                          </div>
                          <div className="stats-grid">
                            <div className="stat-card">
                              <span className="num">98.2%</span>
                              <span className="lbl">אחוז מסירה</span>
                            </div>
                            <div className="stat-card">
                              <span className="num" style={{ color: service.color }}>89.5%</span>
                              <span className="lbl">אחוז קריאה</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {service.id === 'leads' && (
                        <div className="crm-simulation">
                          <div className="crm-lead-item">
                            <div className="lead-info">
                              <span className="name">ישראל ישראלי</span>
                              <span className="phone">050-1234567</span>
                            </div>
                            <span className="badge new">ליד חם</span>
                          </div>
                          <div className="crm-lead-item">
                            <div className="lead-info">
                              <span className="name">מיכל כהן</span>
                              <span className="phone">054-9876543</span>
                            </div>
                            <span className="badge callback" style={{ backgroundColor: service.color }}>נשלח לוואטסאפ</span>
                          </div>
                        </div>
                      )}
                      {service.id === 'balance' && (
                        <div className="balance-simulation">
                          <div className="balance-box">
                            <span className="balance-lbl">יתרה נותרת בחשבון:</span>
                            <span className="balance-val" style={{ color: service.color }}>₪ 248.50</span>
                          </div>
                          <div className="balance-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button className="sim-btn recharge" style={{ backgroundColor: service.color }}>טעינה מהירה</button>
                            <button className="sim-btn history">היסטוריית חיוב</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default ServiceSections;
