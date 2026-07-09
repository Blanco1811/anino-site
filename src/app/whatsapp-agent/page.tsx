'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function WhatsAppAgentPage() {
  const { user, isLoading, login, logout, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showConnectInfo, setShowConnectInfo] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [business, setBusiness] = useState({
    businessName: '',
    businessType: '',
    description: '',
    openingHours: '',
    address: '',
    deliveryAreas: '',
    phone: '',
    whatsappNumber: '',
    whatsappPhoneNumberId: '',
    whatsappWabaId: '',
    whatsappConnectionStatus: 'not_connected',
    whatsappConnectedAt: '',
    whatsappConnectionError: '',
    menuText: '',
    faqText: '',
    agentInstructions: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email.trim(), password);

    if (!result.success) {
      setError(result.error || 'שם משתמש או סיסמה שגויים');
    }

    setLoading(false);
  };


  useEffect(() => {
    if (!isAuthenticated) return;

    fetch('/api/business', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setBusiness({
            businessName: data.profile.businessName || '',
            businessType: data.profile.businessType || '',
            description: data.profile.description || '',
            openingHours: data.profile.openingHours || '',
            address: data.profile.address || '',
            deliveryAreas: data.profile.deliveryAreas || '',
            phone: data.profile.phone || '',
            whatsappNumber: data.profile.whatsappNumber || '',
            whatsappPhoneNumberId: data.profile.whatsappPhoneNumberId || '',
            whatsappWabaId: data.profile.whatsappWabaId || '',
            whatsappConnectionStatus: data.profile.whatsappConnectionStatus || 'not_connected',
            whatsappConnectedAt: data.profile.whatsappConnectedAt || '',
            whatsappConnectionError: data.profile.whatsappConnectionError || '',
            menuText: data.profile.menuText || '',
            faqText: data.profile.faqText || '',
            agentInstructions: data.profile.agentInstructions || '',
          });
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setSaveMessage('');

    try {
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(business),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'שמירת ההגדרות נכשלה');
      }

      setSaveMessage('ההגדרות נשמרו בהצלחה');
      setTimeout(() => {
        setShowSetup(false);
        setSaveMessage('');
      }, 1200);
    } catch (err: any) {
      setSaveMessage(err.message || 'אירעה שגיאה בשמירה');
    } finally {
      setProfileLoading(false);
    }
  };

  const openMessages = async () => {
    setShowMessages(true);
    setMessagesLoading(true);

    try {
      const res = await fetch('/api/whatsapp-agent/messages', {
        credentials: 'same-origin',
      });

      const data = await res.json();

      if (res.ok) {
        setCustomers(data.customers || []);
      }
    } finally {
      setMessagesLoading(false);
    }
  };

  const isWhatsAppConnected = business.whatsappConnectionStatus === 'connected';
  const hasWhatsAppConnectionError = business.whatsappConnectionStatus === 'error';

  if (isLoading) {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>טוען...</main>;
  }

  if (!isAuthenticated) {
    return (
      <main dir="rtl" style={styles.page}>
        <section style={styles.loginCard}>
          <div style={styles.logo}>ANINO</div>
          <h1 style={styles.title}>AI Agent for WhatsApp</h1>
          <p style={styles.subTitle}>חבר את הוואטסאפ העסקי שלך לסוכן AI שעונה ללקוחות 24/7</p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleLogin}>
            <label style={styles.label}>דואר אלקטרוני</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <label style={styles.label}>סיסמה</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />

            <button style={styles.primaryButton} disabled={loading} type="submit">
              {loading ? 'מתחבר...' : 'כניסה למערכת'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" style={styles.page}>
      <section style={styles.dashboard}>
        <header style={styles.header}>
          <div>
            <div style={styles.logo}>ANINO</div>
            <h1 style={{ ...styles.title, marginBottom: 4 }}>AI Agent for WhatsApp</h1>
            <p style={{ ...styles.subTitle, marginBottom: 0 }}>ניהול סוכן הוואטסאפ העסקי שלך</p>
          </div>

          <div style={styles.userBox}>
            <span>{user?.name || user?.email}</span>
            <button style={styles.logoutButton} onClick={logout}>התנתק</button>
          </div>
        </header>

        <div style={styles.grid}>
          <section style={styles.card}>
            <div style={styles.cardIcon}>💬</div>
            <h2 style={styles.cardTitle}>חיבור WhatsApp</h2>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                padding: '8px 12px',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14,
                background: isWhatsAppConnected
                  ? '#e8f8ef'
                  : hasWhatsAppConnectionError
                    ? '#fff0f0'
                    : '#edf5ff',
                color: isWhatsAppConnected
                  ? '#177a3f'
                  : hasWhatsAppConnectionError
                    ? '#c53b3b'
                    : '#315b96',
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: isWhatsAppConnected
                    ? '#22c55e'
                    : hasWhatsAppConnectionError
                      ? '#ef4444'
                      : '#2f80ed',
                }}
              />
              {isWhatsAppConnected
                ? 'WhatsApp מחובר'
                : hasWhatsAppConnectionError
                  ? 'החיבור דורש טיפול'
                  : 'WhatsApp לא מחובר'}
            </div>

            {isWhatsAppConnected ? (
              <>
                <p style={styles.cardText}>
                  המספר המחובר: <strong>{business.whatsappNumber || 'מספר עסקי מחובר'}</strong>
                </p>
                <button
                  style={styles.secondaryButton}
                  type="button"
                  onClick={() => alert('פרטי החיבור יוצגו כאן לאחר השלמת החיבור ל-Meta.')}
                >
                  הצג פרטי חיבור
                </button>
              </>
            ) : (
              <>
                <p style={styles.cardText}>
                  חבר את חשבון ה־WhatsApp Business של העסק כדי שהסוכן יוכל לקבל ולשלוח הודעות.
                </p>

                {hasWhatsAppConnectionError && business.whatsappConnectionError && (
                  <p style={{ ...styles.note, color: '#c53b3b' }}>
                    {business.whatsappConnectionError}
                  </p>
                )}

                <button
                  style={styles.primaryButton}
                  type="button"
                  onClick={() => setShowConnectInfo(true)}
                >
                  חבר WhatsApp Business
                </button>

                <p style={styles.note}>
                  החיבור יתבצע דרך Meta/Facebook. אין צורך לסרוק QR.
                </p>
              </>
            )}
          </section>

          <section style={styles.card}>
            <div style={styles.cardIcon}>🤖</div>
            <h2 style={styles.cardTitle}>סוכן AI</h2>
            <p style={styles.cardText}>הסוכן יענה ללקוחות, ישאל שאלות ויעביר לידים לעסק.</p>
            <button style={styles.secondaryButton} type="button" onClick={() => setShowSetup(true)}>הגדר את הסוכן</button>
          </section>

          <section style={styles.card}>
            <div style={styles.cardIcon}>👥</div>
            <h2 style={styles.cardTitle}>לקוחות והודעות</h2>
            <p style={styles.cardText}>כאן יוצגו השיחות, ההודעות והלידים שיגיעו מהוואטסאפ.</p>
            <button style={styles.secondaryButton} type="button" onClick={openMessages}>הצג הודעות</button>
          </section>
        </div>

        {showConnectInfo && (
          <div style={styles.modalBackdrop}>
            <section style={{ ...styles.modal, maxWidth: 620 }}>
              <div style={styles.modalHeader}>
                <h2 style={{ margin: 0 }}>חיבור WhatsApp Business</h2>
                <button style={styles.closeButton} onClick={() => setShowConnectInfo(false)}>✕</button>
              </div>

              <p style={{ ...styles.cardText, marginTop: 0 }}>
                כאן יחובר חשבון ה־WhatsApp Business של העסק שלך ל־ANINO.
              </p>

              <div style={{ display: 'grid', gap: 12, margin: '22px 0' }}>
                <div style={{ border: '1px solid #d5e5ff', borderRadius: 14, padding: 14, background: '#f7fbff' }}>
                  <strong>1. התחברות ל־Meta</strong>
                  <p style={{ ...styles.note, marginBottom: 0 }}>
                    מתחברים לחשבון Facebook שמנהל את העסק.
                  </p>
                </div>

                <div style={{ border: '1px solid #d5e5ff', borderRadius: 14, padding: 14, background: '#f7fbff' }}>
                  <strong>2. בחירת העסק והמספר</strong>
                  <p style={{ ...styles.note, marginBottom: 0 }}>
                    בוחרים את חשבון WhatsApp Business ואת המספר העסקי.
                  </p>
                </div>

                <div style={{ border: '1px solid #d5e5ff', borderRadius: 14, padding: 14, background: '#f7fbff' }}>
                  <strong>3. הסוכן מתחיל לעבוד</strong>
                  <p style={{ ...styles.note, marginBottom: 0 }}>
                    ANINO מקבלת ושולחת הודעות רק עבור העסק והמספר שנבחרו.
                  </p>
                </div>
              </div>

              <div style={{ borderRadius: 12, background: '#fff7e6', color: '#805b14', padding: 14, lineHeight: 1.6 }}>
                החיבור האמיתי יופעל לאחר השלמת אימות Meta. המסך כבר מוכן לתהליך.
              </div>

              <button
                style={{ ...styles.primaryButton, marginTop: 20 }}
                type="button"
                onClick={() => setShowConnectInfo(false)}
              >
                הבנתי
              </button>
            </section>
          </div>
        )}

        {showSetup && (
          <div style={styles.modalBackdrop}>
            <section style={styles.modal}>
              <div style={styles.modalHeader}>
                <h2 style={{ margin: 0 }}>הגדרות סוכן WhatsApp</h2>
                <button style={styles.closeButton} onClick={() => setShowSetup(false)}>✕</button>
              </div>

              <form onSubmit={saveBusiness} style={styles.formGrid}>
                <label style={styles.label}>שם העסק
                  <input style={styles.input} value={business.businessName} onChange={(e) => setBusiness({ ...business, businessName: e.target.value })} />
                </label>

                <label style={styles.label}>סוג העסק
                  <input style={styles.input} value={business.businessType} onChange={(e) => setBusiness({ ...business, businessType: e.target.value })} placeholder="מסעדה, חנות, קליניקה..." />
                </label>

                <label style={styles.label}>תיאור העסק
                  <textarea style={styles.textarea} value={business.description} onChange={(e) => setBusiness({ ...business, description: e.target.value })} />
                </label>

                <label style={styles.label}>שעות פעילות
                  <input style={styles.input} value={business.openingHours} onChange={(e) => setBusiness({ ...business, openingHours: e.target.value })} placeholder="א׳-ה׳ 09:00-18:00" />
                </label>

                <label style={styles.label}>מספר טלפון
                  <input style={styles.input} value={business.phone} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} />
                </label>

                <label style={styles.label}>מספר WhatsApp
                  <input style={styles.input} value={business.whatsappNumber} onChange={(e) => setBusiness({ ...business, whatsappNumber: e.target.value })} />
                </label>

                <label style={styles.label}>שירותים / תפריט / מחירים
                  <textarea style={styles.textarea} value={business.menuText} onChange={(e) => setBusiness({ ...business, menuText: e.target.value })} />
                </label>

                <label style={styles.label}>שאלות ותשובות נפוצות
                  <textarea style={styles.textarea} value={business.faqText} onChange={(e) => setBusiness({ ...business, faqText: e.target.value })} />
                </label>

                <label style={styles.label}>הנחיות לסוכן AI
                  <textarea style={styles.textarea} value={business.agentInstructions} onChange={(e) => setBusiness({ ...business, agentInstructions: e.target.value })} placeholder="איך הסוכן צריך לדבר, מה חשוב לשאול, מתי להעביר אליי..." />
                </label>

                {saveMessage && <div style={styles.saveMessage}>{saveMessage}</div>}

                <button style={styles.primaryButton} disabled={profileLoading} type="submit">
                  {profileLoading ? 'שומר...' : 'שמור הגדרות'}
                </button>
              </form>
            </section>
          </div>
        )}

        {showMessages && (
          <div style={styles.modalBackdrop}>
            <section style={{ ...styles.modal, maxWidth: 860 }}>
              <div style={styles.modalHeader}>
                <h2 style={{ margin: 0 }}>לקוחות והודעות WhatsApp</h2>
                <button style={styles.closeButton} onClick={() => setShowMessages(false)}>✕</button>
              </div>

              {messagesLoading ? (
                <p style={styles.cardText}>טוען הודעות...</p>
              ) : customers.length === 0 ? (
                <p style={styles.cardText}>עדיין אין הודעות. אחרי שתחבר מספר WhatsApp, השיחות יופיעו כאן.</p>
              ) : (
                <div style={styles.messagesList}>
                  {customers.map((customer) => (
                    <div style={styles.customerBox} key={customer.id}>
                      <strong>{customer.name || 'לקוח WhatsApp'}</strong>
                      <span style={styles.phoneText}>{customer.phone}</span>
                      {(customer.messages || []).map((message: any) => (
                        <div
                          key={message.id}
                          style={{
                            ...styles.messageBubble,
                            alignSelf: message.sender === 'agent' ? 'flex-start' : 'flex-end',
                            background: message.sender === 'agent' ? '#edf5ff' : '#dff7e8',
                          }}
                        >
                          {message.text}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #edf5ff 0%, #f8fbff 55%, #e7f1ff 100%)',
    color: '#172b4d',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Arial, sans-serif',
  },
  loginCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    background: '#ffffff',
    border: '1px solid #d5e5ff',
    padding: 36,
    boxShadow: '0 18px 48px rgba(47,128,237,0.15)',
    backdropFilter: 'none',
  },
  dashboard: {
    width: '100%',
    maxWidth: 1180,
  },
  header: {
    display: 'flex',
    gap: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    flexWrap: 'wrap',
  },
  logo: {
    fontWeight: 900,
    letterSpacing: 2,
    color: '#2f80ed',
    fontSize: 18,
    marginBottom: 10,
    direction: 'ltr',
  },
  title: {
    fontSize: 32,
    margin: 0,
    fontWeight: 800,
  },
  subTitle: {
    color: '#5c7fb8',
    lineHeight: 1.6,
    marginTop: 10,
    marginBottom: 24,
  },
  label: {
    display: 'block',
    color: '#315b96',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: 18,
    borderRadius: 12,
    border: '1px solid #b8d4ff',
    background: '#f7fbff',
    color: '#172b4d',
    padding: '14px 15px',
    fontSize: 16,
  },
  primaryButton: {
    width: '100%',
    border: 0,
    borderRadius: 12,
    padding: '14px 18px',
    background: '#2f80ed',
    color: '#ffffff',
    fontWeight: 900,
    fontSize: 16,
  },
  secondaryButton: {
    width: '100%',
    border: '1px solid #2f80ed',
    borderRadius: 12,
    padding: '14px 18px',
    background: '#ffffff',
    color: '#2f80ed',
    fontWeight: 800,
    fontSize: 16,
  },
  error: {
    background: '#fff1f1',
    border: '1px solid rgba(248,113,113,0.85)',
    color: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  userBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#ffffff',
    border: '1px solid #d5e5ff',
    borderRadius: 14,
    padding: '10px 12px',
    color: '#315b96',
  },
  logoutButton: {
    border: 0,
    borderRadius: 9,
    background: '#edf5ff',
    color: '#172b4d',
    padding: '8px 10px',
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 18,
  },
  card: {
    borderRadius: 22,
    background: '#ffffff',
    border: '1px solid rgba(255,255,255,0.15)',
    padding: 26,
    boxShadow: '0 12px 30px rgba(47,128,237,0.12)',
  },
  cardIcon: {
    fontSize: 38,
    marginBottom: 14,
  },
  cardTitle: {
    margin: '0 0 10px',
    fontSize: 22,
  },
  cardText: {
    margin: '0 0 18px',
    color: '#5c7fb8',
    minHeight: 54,
    lineHeight: 1.6,
  },
  note: {
    margin: '14px 0 0',
    color: '#6d89b5',
    fontSize: 13,
    lineHeight: 1.5,
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 100000,
    display: 'grid',
    placeItems: 'center',
    padding: 18,
    background: 'rgba(15, 32, 62, 0.45)',
  },
  modal: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '88vh',
    overflowY: 'auto',
    borderRadius: 22,
    padding: 24,
    background: '#ffffff',
    color: '#172b4d',
    boxShadow: '0 20px 60px rgba(15, 55, 120, 0.26)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  closeButton: {
    border: 0,
    borderRadius: 9,
    padding: '7px 10px',
    cursor: 'pointer',
    background: '#edf5ff',
    color: '#315b96',
    fontWeight: 800,
  },
  formGrid: {
    display: 'grid',
    gap: 14,
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 92,
    resize: 'vertical',
    borderRadius: 12,
    border: '1px solid #b8d4ff',
    background: '#f7fbff',
    color: '#172b4d',
    padding: '12px 14px',
    marginTop: 8,
    fontFamily: 'inherit',
    fontSize: 15,
  },
  saveMessage: {
    borderRadius: 10,
    padding: 12,
    background: '#edf8f1',
    color: '#18753a',
    fontWeight: 700,
  },
  messagesList: {
    display: 'grid',
    gap: 14,
  },
  customerBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    border: '1px solid #d5e5ff',
    borderRadius: 16,
    padding: 14,
    background: '#fbfdff',
  },
  phoneText: {
    color: '#5c7fb8',
    fontSize: 13,
    direction: 'ltr',
    textAlign: 'right',
  },
  messageBubble: {
    width: 'fit-content',
    maxWidth: '86%',
    borderRadius: 12,
    padding: '10px 12px',
    color: '#172b4d',
    lineHeight: 1.5,
  },
};
