'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';

interface Agent {
  id: string;
  name: string;
  number: string;
  purpose: string;
  status: string;
  tone: string[];
  slug?: string;
}

const formatStatus = (status?: string) => {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s === 'waiting') return 'ממתין';
  if (s === 'in_progress') return 'בשיחה';
  if (s === 'completed') return 'הושלם';
  return status;
};

const formatTone = (tone?: string) => {
  if (!tone) return '';
  const t = tone.toLowerCase();
  if (t === 'friendly') return 'ידידותי';
  if (t === 'professional') return 'מקצועי';
  if (t === 'empathetic') return 'אמפתי';
  if (t === 'humorous') return 'הומוריסטי';
  return tone;
};

export default function AgentPage() {
  const { user, isLoading, login, logout, isAuthenticated } = useAuth();

  // Authentication UI states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // Agent workspace states
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [agentError, setAgentError] = useState<string | null>(null);

  // Phone dial modal states
  const [showDialModal, setShowDialModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callGoal, setCallGoal] = useState('');
  const [dialLoading, setDialLoading] = useState(false);
  const [dialError, setDialError] = useState<string | null>(null);
  const [dialSuccess, setDialSuccess] = useState<string | null>(null);

  // WebRTC Browser Call using reusable hook
  const {
    isWebRTCOn,
    webRTCLoading,
    webRTCError,
    startCall,
    stopCall
  } = useWebRTCCall({
    sessionApiUrl: '/api/realtime/session',
    agentSlug: agent?.slug
  });

  // Edit agent modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editTone, setEditTone] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Link copy and new agent link states
  const [linkCopied, setLinkCopied] = useState(false);
  const [createdAgentLink, setCreatedAgentLink] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [showCreateAgentForm, setShowCreateAgentForm] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPurpose, setNewAgentPurpose] = useState('');
  const [createAgentLoading, setCreateAgentLoading] = useState(false);
  const [createAgentError, setCreateAgentError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // Fetch or create voice agent
  const fetchOrCreateAgent = async () => {
    setAgentLoading(true);
    setAgentError(null);
    try {
      const res = await fetch('/api/agents');
      if (res.status === 401) {
        setAgentError('אין הרשאה');
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch agents');
      }
      
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setAgent(data.items[0]);
      } else {
        setAgent(null);
      }
    } catch (err: any) {
      setAgentError(err.message || 'אירעה שגיאה בטעינת נתוני הסוכן.');
    } finally {
      setAgentLoading(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = newAgentName.trim();
    const purpose = newAgentPurpose.trim();

    if (!name) {
      setCreateAgentError('יש להזין שם לסוכן.');
      return;
    }

    setCreateAgentLoading(true);
    setCreateAgentError(null);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          purpose,
          phoneNumber: '',
          tone: [],
          startTime: '',
          endTime: ''
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'יצירת הסוכן נכשלה.');
      }

      setAgent(data.agent);
      setCreatedAgentLink(`${window.location.origin}/${data.agent.slug}`);
      setShowCreateAgentForm(false);
      setNewAgentName('');
      setNewAgentPurpose('');
    } catch (err: any) {
      setCreateAgentError(err.message || 'אירעה שגיאה ביצירת הסוכן.');
    } finally {
      setCreateAgentLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrCreateAgent();
    }
  }, [isAuthenticated]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await login(email, password);
      if (!res.success) {
        setLoginError(res.error || 'שם משתמש או סיסמה שגויים');
      }
    } catch (err) {
      setLoginError('חיבור השרת נכשל');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setRegisterLoading(true);

    try {
      const registerRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim()
        })
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(registerData.error || 'יצירת החשבון נכשלה.');
      }

      const loginRes = await login(email.trim(), password);

      if (!loginRes.success) {
        setLoginError('החשבון נוצר בהצלחה. התחבר עם פרטי החשבון שלך.');
        setIsRegisterMode(false);
        return;
      }
    } catch (err: any) {
      setLoginError(err.message || 'אירעה שגיאה ביצירת החשבון.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialError(null);
    setDialSuccess(null);
    setDialLoading(true);

    if (!agent) {
      setDialError('לא נטען סוכן פעיל.');
      setDialLoading(false);
      return;
    }

    // Format Israeli phone numbers (e.g. 0556888870 -> +972556888870)
    let formattedNumber = phoneNumber.trim();
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '+972' + formattedNumber.slice(1);
    }

    try {
      const res = await fetch(`/api/agents/${agent.id}/calls/dial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formattedNumber,
          goal: callGoal
        })
      });

      const data = await res.json();

      if (!res.ok) {
        // Return the actual error message from the backend JSON response
        throw new Error(data.error || 'התקשרות נכשלה מסיבה לא ידועה.');
      }

      setDialSuccess(`השיחה הועברה בהצלחה! מספר מזהה לשיחה: ${data.twilioCallSid || 'לא זמין'}`);
      setPhoneNumber('');
      setCallGoal('');
      
      // Auto close modal after 3 seconds on success
      setTimeout(() => {
        setShowDialModal(false);
        setDialSuccess(null);
      }, 3000);

    } catch (err: any) {
      setDialError(err.message || 'אירעה שגיאה בביצוע השיחה.');
    } finally {
      setDialLoading(false);
    }
  };



  // Copy public agent link function
  const copyPublicLink = () => {
    if (agent?.slug) {
      const publicLink = `${origin}/${agent.slug}`;
      navigator.clipboard.writeText(publicLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Open edit modal and populate state
  const openEditModal = () => {
    if (agent) {
      setEditName(agent.name);
      setEditPurpose(agent.purpose || '');
      setEditTone(agent.tone || []);
      setEditError(null);
      setEditSuccess(null);
      setShowEditModal(true);
    }
  };

  // Handle tone selection checkbox changes
  const handleToneChange = (toneVal: string) => {
    if (editTone.includes(toneVal)) {
      setEditTone(editTone.filter(t => t !== toneVal));
    } else {
      setEditTone([...editTone, toneVal]);
    }
  };

  // Submit edit form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setEditSuccess(null);
    setEditLoading(true);

    if (!agent) {
      setEditError('לא נטען סוכן פעיל.');
      setEditLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          purpose: editPurpose,
          tone: editTone
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'עדכון הסוכן נכשל.');
      }

      setAgent(data.agent);
      setEditSuccess('הסוכן עודכן בהצלחה!');
      
      // Auto close modal after 1.5 seconds on success
      setTimeout(() => {
        setShowEditModal(false);
        setEditSuccess(null);
      }, 1500);

    } catch (err: any) {
      setEditError(err.message || 'אירעה שגיאה בעדכון הסוכן.');
    } finally {
      setEditLoading(false);
    }
  };



  if (isLoading) {
    return (
      <div className="agent-container flex-center">
        <div className="pulse-loader"></div>
        <p>טוען את המערכת...</p>
        <style jsx>{`
          .agent-container {
            width: 100vw;
            height: 100vh;
            background: #0b0c10;
            color: #45f3ff;
            font-family: sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .pulse-loader {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #00D09C;
            animation: pulse 1.5s infinite ease-in-out;
            margin-bottom: 20px;
          }
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(0.8); opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  // Render Login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="login-screen" dir="rtl">
        <div className="login-card">
          <h2>{isRegisterMode ? 'פתיחת חשבון חדש' : 'כניסה למערכת הסוכן'}</h2>
          <p className="desc">
            {isRegisterMode
              ? 'פתח חשבון והתחל ליצור את הסוכן הקולי שלך'
              : 'התחבר כדי לנהל את סוכן ה-AI הקולי ולהתחיל שיחה'}
          </p>

          {loginError && <div className="error-banner">{loginError}</div>}

          <form onSubmit={isRegisterMode ? handleRegisterSubmit : handleLoginSubmit}>
            {isRegisterMode && (
              <>
                <div className="form-group">
                  <label>שם פרטי</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="ישראל"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>שם משפחה</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="ישראלי"
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>דואר אלקטרוני</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {isRegisterMode && (
              <div className="form-group">
                <label>מספר טלפון</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0500000000"
                />
              </div>
            )}

            <div className="form-group">
              <label>סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="********"
                required
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isRegisterMode ? registerLoading : loginLoading}
            >
              {isRegisterMode
                ? (registerLoading ? 'יוצר חשבון...' : 'צור חשבון')
                : (loginLoading ? 'מתחבר...' : 'התחבר למערכת')}
            </button>
          </form>

          <button
            type="button"
            className="mode-switch-btn"
            onClick={() => {
              setLoginError(null);
              setIsRegisterMode(current => !current);
            }}
          >
            {isRegisterMode ? 'כבר יש לך חשבון? התחבר' : 'אין לך חשבון? פתח חשבון חדש'}
          </button>
        </div>

        <style jsx>{`
          .login-screen {
            width: 100vw;
            height: 100vh;
            background: radial-gradient(circle at center, #1f2833 0%, #0b0c10 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            color: #fff;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .login-card {
            background: rgba(31, 40, 51, 0.6);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 40px;
            border-radius: 16px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          }
          h2 {
            margin: 0 0 10px 0;
            font-size: 24px;
            text-align: center;
            color: #00D09C;
          }
          .desc {
            color: #c5a880;
            text-align: center;
            margin: 0 0 24px 0;
            font-size: 14px;
          }
          .error-banner {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid #ef4444;
            color: #f87171;
            padding: 10px;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 20px;
            text-align: center;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
          }
          label {
            font-size: 14px;
            color: #b0b0b0;
            font-weight: 500;
          }
          input {
            background: #0b0c10;
            border: 1px solid #45f3ff;
            color: #fff;
            padding: 12px;
            border-radius: 8px;
            font-size: 16px;
            outline: none;
            transition: all 0.2s ease;
          }
          input:focus {
            box-shadow: 0 0 0 3px rgba(69, 243, 255, 0.2);
          }
          .login-btn {
            background: #00D09C;
            color: #0b0c10;
            border: none;
            padding: 14px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px rgba(0, 208, 156, 0.3);
          }
          .login-btn:hover {
            transform: translateY(-2px);
            background: #05e2ab;
          }
          .login-btn:disabled {
            background: #666;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          .mode-switch-btn {
            width: 100%;
            margin-top: 16px;
            border: 0;
            background: transparent;
            color: #45f3ff;
            font-size: 14px;
            cursor: pointer;
            text-decoration: underline;
          }
          .mode-switch-btn:hover {
            color: #00D09C;
          }
        `}</style>
      </div>
    );
  }

  // Render Dashboard
  return (
    <div className="agent-dashboard" dir="rtl">
      {/* Header bar */}
      <header className="dash-header">
        <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/logo.png" 
            alt="ANINO Logo" 
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }} 
          />
          <h1>סוכן קולי חכם</h1>
        </div>
        <div className="user-section">
          <span>שלום, {user?.name || user?.email}</span>
          <button onClick={logout} className="logout-btn">התנתק</button>
        </div>
      </header>

      {/* Main Panel */}
      <main className="dash-main">
        {showCreateAgentForm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0, 0, 0, 0.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <form
              onSubmit={handleCreateAgent}
              style={{
                width: '100%',
                maxWidth: '500px',
                background: '#1f2833',
                border: '1px solid rgba(69,243,255,0.35)',
                borderRadius: '20px',
                padding: '30px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
              }}
            >
              <h2 style={{ color: '#ffffff', marginTop: 0, marginBottom: '12px' }}>
                יצירת סוכן קולי חדש
              </h2>

              <p style={{ color: '#b9c4d0', lineHeight: '1.6', marginBottom: '22px' }}>
                תן לסוכן שם והסבר קצר מה הוא אמור לעשות.
              </p>

              <label style={{ display: 'block', color: '#ffffff', marginBottom: '8px' }}>
                שם הסוכן
              </label>
              <input
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="לדוגמה: סוכן המסעדה"
                autoFocus
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '13px',
                  borderRadius: '10px',
                  border: '1px solid #52606d',
                  background: '#111820',
                  color: '#ffffff',
                  marginBottom: '18px',
                  fontSize: '16px'
                }}
              />

              <label style={{ display: 'block', color: '#ffffff', marginBottom: '8px' }}>
                מה הסוכן עושה?
              </label>
              <textarea
                value={newAgentPurpose}
                onChange={(e) => setNewAgentPurpose(e.target.value)}
                placeholder="לדוגמה: מקבל הזמנות, עונה ללקוחות ומסביר על השירותים."
                rows={4}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '13px',
                  borderRadius: '10px',
                  border: '1px solid #52606d',
                  background: '#111820',
                  color: '#ffffff',
                  marginBottom: '12px',
                  fontSize: '16px',
                  resize: 'vertical'
                }}
              />

              {createAgentError && (
                <p style={{ color: '#ff8a8a', margin: '8px 0 16px' }}>
                  {createAgentError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createAgentLoading}
                  style={{ flex: 1, padding: '13px', borderRadius: '10px' }}
                >
                  {createAgentLoading ? 'יוצר סוכן...' : 'צור סוכן'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAgentForm(false);
                    setCreateAgentError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: '10px',
                    border: '1px solid #52606d',
                    background: 'transparent',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        )}

        {createdAgentLink && (
          <div className="new-agent-success-banner">
            <strong>סוכן קולי נוצר בהצלחה!</strong>
            <span style={{ marginRight: '8px' }}>
              הקישור הציבורי שלך פעיל כעת בכתובת: {' '}
              <a href={createdAgentLink} target="_blank" rel="noopener noreferrer">
                {createdAgentLink}
              </a>
            </span>
          </div>
        )}

        {agentLoading ? (
          <div className="loading-state">טוען נתוני סוכן...</div>
        ) : agentError ? (
          <div className="error-state">
            <p>{agentError}</p>
            <button onClick={fetchOrCreateAgent} className="retry-btn">נסה שוב</button>
          </div>
        ) : !agent ? (
          <section
            style={{
              minHeight: 'calc(100vh - 76px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              background: 'radial-gradient(circle at center, rgba(69,243,255,0.12), transparent 38%), #0b0c10'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '680px',
                textAlign: 'center',
                padding: '42px 25px',
                background: 'rgba(31,40,51,0.82)',
                border: '1px solid rgba(69,243,255,0.22)',
                borderRadius: '24px',
                boxShadow: '0 18px 48px rgba(0,0,0,0.35)'
              }}
            >
              <div
                style={{
                  width: '118px',
                  height: '118px',
                  margin: '0 auto 26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid #45f3ff',
                  boxShadow: '0 0 28px rgba(69,243,255,0.35)',
                  fontSize: '52px'
                }}
              >
                🎤
              </div>

              <h2 style={{ color: '#ffffff', fontSize: 'clamp(30px, 6vw, 46px)', marginBottom: '16px' }}>
                הסוכן שלך מתחיל לדבר כאן
              </h2>

              <p style={{ color: '#b9c4d0', fontSize: '18px', lineHeight: '1.8', maxWidth: '510px', margin: '0 auto 28px' }}>
                צור סוכן AI קולי שידבר עם אנשים, יקבל שיחות
                ויוציא שיחות לפי ההנחיות שתגדיר לו.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setCreateAgentError(null);
                  setShowCreateAgentForm(true);
                }}
                style={{ minWidth: '280px', padding: '16px 24px', fontSize: '17px', borderRadius: '12px' }}
              >
                צור סוכן קולי ראשון
              </button>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  marginTop: '40px'
                }}
              >
                <div style={{ color: '#d9faff', fontSize: '14px' }}>🎙️<br /><strong>מדבר טבעי</strong></div>
                <div style={{ color: '#d9faff', fontSize: '14px' }}>☎️<br /><strong>מבצע שיחות</strong></div>
                <div style={{ color: '#d9faff', fontSize: '14px' }}>📞<br /><strong>מקבל שיחות</strong></div>
              </div>
            </div>
          </section>
        ) : (
          <div className="agent-content-layout">
            
            {/* Visualizer Area */}
            <div className="card-visualizer shadow-card">
              <div className="visual-status">
                <span className={`status-dot ${isWebRTCOn ? 'active' : ''}`}></span>
                <span>{isWebRTCOn ? 'שיחה קולית פעילה דרך הדפדפן' : 'מוכן לשיחה'}</span>
              </div>

              {/* The glowing audio circle / waveform */}
              <div className="sphere-wrapper">
                <div className={`sphere-glowing ${isWebRTCOn ? 'speaking' : ''}`}>
                  {isWebRTCOn ? (
                    <div className="wave-container">
                      <span className="bar wave-1"></span>
                      <span className="bar wave-2"></span>
                      <span className="bar wave-3"></span>
                      <span className="bar wave-4"></span>
                      <span className="bar wave-5"></span>
                    </div>
                  ) : (
                    <span className="sphere-icon">🎤</span>
                  )}
                </div>
              </div>

              {/* Interactive buttons */}
              <div className="action-buttons-group">
                 {!isWebRTCOn ? (
                  <button 
                    onClick={startCall} 
                    className="btn btn-primary"
                    disabled={webRTCLoading}
                  >
                    {webRTCLoading ? 'מתחבר למיקרופון...' : 'דברו עם הסוכן (בדפדפן)'}
                  </button>
                ) : (
                  <button onClick={stopCall} className="btn btn-danger">
                    נתק שיחה
                  </button>
                )}

                <button 
                  onClick={() => setShowDialModal(true)} 
                  className="btn btn-secondary"
                  disabled={isWebRTCOn}
                >
                  צור שיחת טלפון (Twilio)
                </button>
              </div>

              {webRTCError && <div className="error-text mt-15">{webRTCError}</div>}
            </div>

            {/* Agent Metadata Panel */}
            <div className="card-info shadow-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                <h2 style={{ margin: 0, border: 'none', padding: 0 }}>כרטיס סוכן: {agent?.name}</h2>
                <button onClick={openEditModal} className="btn-edit-agent">עריכת פרטי סוכן</button>
              </div>

              {agent?.slug && (
                <div className="info-item">
                  <span className="info-label">קישור ציבורי לסוכן:</span>
                  <div className="public-link-box">
                    <a href={`${origin}/${agent.slug}`} target="_blank" rel="noopener noreferrer" className="public-link-text">
                      {origin}/{agent.slug}
                    </a>
                    <button onClick={copyPublicLink} className="copy-link-btn">
                      {linkCopied ? 'הועתק!' : 'העתק קישור ציבורי'}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="info-item">
                <span className="info-label">סטטוס סוכן:</span>
                <span className="info-val highlight">{formatStatus(agent?.status)}</span>
              </div>

              <div className="info-item">
                <span className="info-label">מטרה והנחיות:</span>
                <p className="info-val text-box">{agent?.purpose}</p>
              </div>

              <div className="info-item">
                <span className="info-label">טון דיבור מוגדר:</span>
                <div className="tag-container">
                  {agent?.tone.map((t, idx) => (
                    <span key={idx} className="tag-pill">{formatTone(t)}</span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Outbound call modal */}
      {showDialModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>צור שיחה חדשה</h3>
              <button onClick={() => setShowDialModal(false)} className="close-x">✕</button>
            </div>
            
            <form onSubmit={handleDialSubmit} className="modal-form">
              {dialError && <div className="error-banner mb-15">{dialError}</div>}
              {dialSuccess && <div className="success-banner mb-15">{dialSuccess}</div>}

              <div className="form-group">
                <label>מספר טלפון ליעד (כולל קידומת מדינה, או 05 עבור ישראל)</label>
                <input 
                  type="tel" 
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)} 
                  placeholder="0556888870"
                  required 
                />
              </div>

              <div className="form-group">
                <label>מטרת השיחה / הנחיות מיוחדות לשיחה זו <span style={{ opacity: 0.65 }}>(לא חובה)</span></label>
                <textarea 
                  value={callGoal} 
                  onChange={e => setCallGoal(e.target.value)} 
                  placeholder="אפשר להשאיר ריק — הסוכן יפעל לפי ההנחיות שהוגדרו לו."
                  rows={4}
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={dialLoading}>
                  {dialLoading ? 'מוציא שיחה...' : 'אישור והתחל שיחה'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowDialModal(false)} 
                  className="btn btn-cancel"
                  disabled={dialLoading}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>עריכת פרטי סוכן</h3>
              <button onClick={() => setShowEditModal(false)} className="close-x">✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="modal-form">
              {editError && <div className="error-banner mb-15">{editError}</div>}
              {editSuccess && <div className="success-banner mb-15">{editSuccess}</div>}

              <div className="form-group">
                <label>שם הסוכן (שם זה ישמש ליצירת הכתובת הציבורית)</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  placeholder="למשל: קדמה"
                  required 
                />
              </div>

              <div className="form-group">
                <label>מטרה והנחיות לסוכן</label>
                <textarea 
                  value={editPurpose} 
                  onChange={e => setEditPurpose(e.target.value)} 
                  placeholder="הגדר את תפקיד הסוכן וההנחיות שלו..."
                  rows={4}
                  required
                />
              </div>

              <div className="form-group">
                <label>טון דיבור</label>
                <div style={{ display: 'flex', gap: '15px', marginTop: '5px', flexWrap: 'wrap' }}>
                  {['professional', 'friendly', 'empathetic', 'humorous'].map((t) => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={editTone.includes(t)}
                        onChange={() => handleToneChange(t)}
                        style={{ cursor: 'pointer' }}
                      />
                      {t === 'professional' ? 'מקצועי' :
                       t === 'friendly' ? 'ידידותי' :
                       t === 'empathetic' ? 'אמפתי' :
                       t === 'humorous' ? 'הומוריסטי' : t}
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? 'שומר שינויים...' : 'שמור שינויים'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="btn btn-cancel"
                  disabled={editLoading}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        .agent-dashboard {
          width: 100vw;
          min-height: 100vh;
          background: #0b0c10;
          color: #fff;
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #1f2833;
          padding: 15px 30px;
          border-bottom: 2px solid rgba(0, 208, 156, 0.25);
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          font-size: 28px;
        }

        .dash-header h1 {
          margin: 0;
          font-size: 20px;
          color: #00D09C;
        }

        .user-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .logout-btn {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.5);
          color: #f87171;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          background: #ef4444;
          color: #fff;
        }

        .dash-main {
          flex: 1;
          padding: 40px;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }

        .agent-content-layout {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 30px;
        }

        @media (max-width: 768px) {
          .agent-content-layout {
            grid-template-columns: 1fr;
          }
        }

        .shadow-card {
          background: rgba(31, 40, 51, 0.4);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        /* Visualizer Sphere styles */
        .card-visualizer {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          min-height: 400px;
        }

        .visual-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #b0b0b0;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          background: #4a5568;
          border-radius: 50%;
        }

        .status-dot.active {
          background: #22c55e;
          box-shadow: 0 0 10px #22c55e;
          animation: pulse-green 1.5s infinite;
        }

        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }

        .sphere-wrapper {
          margin: 40px 0;
        }

        .sphere-glowing {
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, #0b0c10 0%, #1f2833 100%);
          border: 4px solid #45f3ff;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 0 20px rgba(69, 243, 255, 0.3);
          transition: all 0.3s ease;
        }

        .sphere-glowing.speaking {
          border-color: #00D09C;
          box-shadow: 0 0 35px rgba(0, 208, 156, 0.6);
        }

        .sphere-icon {
          font-size: 50px;
        }

        .wave-container {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 50px;
        }

        .bar {
          width: 6px;
          background: #00D09C;
          border-radius: 3px;
          animation: dance 1s infinite alternate ease-in-out;
        }

        .wave-1 { height: 15px; animation-delay: 0.1s; }
        .wave-2 { height: 25px; animation-delay: 0.3s; }
        .wave-3 { height: 40px; animation-delay: 0.5s; }
        .wave-4 { height: 20px; animation-delay: 0.2s; }
        .wave-5 { height: 30px; animation-delay: 0.4s; }

        @keyframes dance {
          0% { transform: scaleY(1); }
          100% { transform: scaleY(2.2); }
        }

        .action-buttons-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 320px;
        }

        /* Buttons Styling */
        .btn {
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .btn-primary {
          background: #00D09C;
          color: #0b0c10;
          box-shadow: 0 4px 12px rgba(0, 208, 156, 0.25);
        }

        .btn-primary:hover {
          background: #05e2ab;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #1f2833;
          border: 1px solid #45f3ff;
          color: #45f3ff;
        }

        .btn-secondary:hover {
          background: rgba(69, 243, 255, 0.1);
          transform: translateY(-1px);
        }

        .btn-danger {
          background: #ef4444;
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .btn-cancel {
          background: rgba(255, 255, 255, 0.05);
          color: #b0b0b0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* Info card styling */
        .card-info h2 {
          color: #00D09C;
          margin-top: 0;
          margin-bottom: 25px;
          font-size: 22px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 12px;
        }

        .info-item {
          margin-bottom: 24px;
        }

        .info-label {
          display: block;
          font-size: 13px;
          color: #8f9aa7;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .info-val {
          font-size: 16px;
        }

        .info-val.highlight {
          color: #45f3ff;
          font-weight: bold;
          text-transform: uppercase;
        }

        .text-box {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 15px;
          border-radius: 8px;
          line-height: 1.5;
          margin: 0;
          font-size: 14px;
        }

        .tag-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tag-pill {
          background: rgba(69, 243, 255, 0.1);
          border: 1px solid rgba(69, 243, 255, 0.2);
          color: #45f3ff;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
        }

        /* Modal Overlay and Form */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }

        .modal-content {
          background: #1f2833;
          border: 1px solid rgba(0, 208, 156, 0.3);
          padding: 30px;
          border-radius: 16px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modal-in {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #00D09C;
        }

        .close-x {
          background: none;
          border: none;
          color: #a0aec0;
          font-size: 20px;
          cursor: pointer;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
        }

        .form-group textarea {
          background: #0b0c10;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          padding: 12px;
          border-radius: 8px;
          font-size: 15px;
          outline: none;
          resize: vertical;
          font-family: inherit;
        }

        .form-group textarea:focus {
          border-color: #00D09C;
          box-shadow: 0 0 0 3px rgba(0, 208, 156, 0.15);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 25px;
        }

        /* Success & Error Banners */
        .success-banner {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid #22c55e;
          color: #4ade80;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
        }

        /* Helper Classes */
        .mb-15 { margin-bottom: 15px; }
        .mt-15 { margin-top: 15px; }
        .error-text { color: #f87171; font-size: 14px; text-align: center; }
        .loading-state, .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #a0aec0;
        }
        .retry-btn {
          margin-top: 15px;
          background: #00D09C;
          color: #0b0c10;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
        }

        .btn-edit-agent {
          background: rgba(69, 243, 255, 0.15);
          border: 1px solid #45f3ff;
          color: #45f3ff;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .btn-edit-agent:hover {
          background: #45f3ff;
          color: #0b0c10;
        }

        .public-link-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 10px 15px;
          border-radius: 8px;
          margin-top: 8px;
        }

        .public-link-text {
          color: #00D09C;
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          word-break: break-all;
          flex: 1;
        }

        .public-link-text:hover {
          text-decoration: underline;
        }

        .copy-link-btn {
          background: #00D09C;
          color: #0b0c10;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .copy-link-btn:hover {
          background: #05e2ab;
        }

        .new-agent-success-banner {
          background: rgba(0, 208, 156, 0.15);
          border: 1px solid #00D09C;
          color: #a3f7df;
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 25px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .new-agent-success-banner a {
          color: #45f3ff;
          font-weight: bold;
          text-decoration: none;
        }

        .new-agent-success-banner a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
