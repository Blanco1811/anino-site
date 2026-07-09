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
  greeting?: string;
  voiceGender?: string;
  voiceName?: string;
  responseLength?: string;
  conversationStyle?: string;
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

const agentVoiceGenderOptions = [
  { value: 'neutral', label: 'ניטרלי', defaultVoice: 'alloy' },
  { value: 'male', label: 'דיבור זכר', defaultVoice: 'cedar' },
  { value: 'female', label: 'דיבור נקבה', defaultVoice: 'marin' },
];

const agentVoiceOptions = [
  { value: 'alloy', label: 'Alloy - ניטרלי' },
  { value: 'cedar', label: 'Cedar - זכר' },
  { value: 'marin', label: 'Marin - נקבה' },
  { value: 'coral', label: 'Coral' },
  { value: 'sage', label: 'Sage' },
  { value: 'echo', label: 'Echo' },
  { value: 'shimmer', label: 'Shimmer' },
  { value: 'verse', label: 'Verse' },
  { value: 'ash', label: 'Ash' },
  { value: 'ballad', label: 'Ballad' },
];

const responseLengthOptions = [
  { value: 'short', label: 'קצר' },
  { value: 'normal', label: 'רגיל' },
  { value: 'detailed', label: 'מפורט' },
];

const conversationStyleOptions = [
  { value: 'professional', label: 'מקצועי' },
  { value: 'warm', label: 'חם ואנושי' },
  { value: 'sales', label: 'מכירתי' },
  { value: 'calm', label: 'רגוע' },
];

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
  const { user, isLoading, logout, isAuthenticated } = useAuth();
  const hasMainSession = isAuthenticated || Boolean(user);

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
    sessionApiUrl: agent?.slug ? `/api/agents/by-slug/${agent.slug}/session` : '/api/realtime/session',
    agentSlug: agent?.slug
  });

  // Edit agent modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editTone, setEditTone] = useState<string[]>([]);
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editGreeting, setEditGreeting] = useState('');
  const [editVoiceGender, setEditVoiceGender] = useState('neutral');
  const [editVoiceName, setEditVoiceName] = useState('alloy');
  const [editResponseLength, setEditResponseLength] = useState('normal');
  const [editConversationStyle, setEditConversationStyle] = useState('professional');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Link copy and new agent link states
  const [linkCopied, setLinkCopied] = useState(false);
  const [createdAgentLink, setCreatedAgentLink] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  const [showCreateAgentForm, setShowCreateAgentForm] = useState(false);
  const [createAgentName, setCreateAgentName] = useState('');
  const [createAgentPurpose, setCreateAgentPurpose] = useState('');
  const [createAgentPhoneNumber, setCreateAgentPhoneNumber] = useState('');
  const [createAgentStartTime, setCreateAgentStartTime] = useState('');
  const [createAgentEndTime, setCreateAgentEndTime] = useState('');
  const [createAgentTone, setCreateAgentTone] = useState<string[]>(['professional', 'friendly']);
  const [createAgentGreeting, setCreateAgentGreeting] = useState('');
  const [createAgentVoiceGender, setCreateAgentVoiceGender] = useState('neutral');
  const [createAgentVoiceName, setCreateAgentVoiceName] = useState('alloy');
  const [createAgentResponseLength, setCreateAgentResponseLength] = useState('normal');
  const [createAgentConversationStyle, setCreateAgentConversationStyle] = useState('professional');
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [createAgentLoading, setCreateAgentLoading] = useState(false);
  const [createAgentError, setCreateAgentError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !hasMainSession) {
      window.location.replace('/');
    }
  }, [isLoading, hasMainSession]);

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
        setShowCreateAgentForm(true);
      }
    } catch (err: any) {
      setAgentError(err.message || 'אירעה שגיאה בטעינת נתוני הסוכן.');
    } finally {
      setAgentLoading(false);
    }
  };

  useEffect(() => {
    if (hasMainSession) {
      fetchOrCreateAgent();
    }
  }, [hasMainSession]);


  const toggleCreateTone = (tone: string) => {
    setCreateAgentTone((current) =>
      current.includes(tone)
        ? current.filter((item) => item !== tone)
        : [...current, tone]
    );
  };

  const playVoicePreview = async (voice: string, sampleText?: string) => {
    if (!voice || previewingVoice) return;

    setPreviewingVoice(voice);

    try {
      const res = await fetch('/api/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice,
          text: (sampleText || createAgentGreeting).trim() || 'שלום, אני הסוכן של אנינו. איך אפשר לעזור?'
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'לא הצלחתי להשמיע דוגמת קול.');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => URL.revokeObjectURL(url);

      await audio.play();
    } catch (err: any) {
      alert(err.message || 'לא הצלחתי להשמיע דוגמת קול.');
    } finally {
      setPreviewingVoice(null);
    }
  };


  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAgentError(null);

    const name = createAgentName.trim();
    const purpose = createAgentPurpose.trim();

    if (!name) {
      setCreateAgentError('יש להזין שם לסוכן.');
      return;
    }

    if (!purpose) {
      setCreateAgentError('יש להזין מטרה / הוראות לסוכן.');
      return;
    }

    setCreateAgentLoading(true);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          purpose,
          phoneNumber: createAgentPhoneNumber.trim(),
          startTime: createAgentStartTime,
          endTime: createAgentEndTime,
          tone: createAgentTone,
          greeting: createAgentGreeting.trim(),
          voiceGender: createAgentVoiceGender,
          voiceName: createAgentVoiceName,
          responseLength: createAgentResponseLength,
          conversationStyle: createAgentConversationStyle
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'יצירת הסוכן נכשלה.');
      }

      setAgent(data.agent);
      setShowCreateAgentForm(false);
      setCreateAgentName('');
      setCreateAgentPurpose('');
      setCreateAgentPhoneNumber('');
      setCreateAgentStartTime('');
      setCreateAgentEndTime('');
      setCreateAgentTone(['professional', 'friendly']);
      setCreateAgentGreeting('');
      setCreateAgentVoiceGender('neutral');
      setCreateAgentVoiceName('alloy');
      setCreateAgentResponseLength('normal');
      setCreateAgentConversationStyle('professional');

      if (data.agent?.slug) {
        const baseOrigin = origin || window.location.origin;
        setCreatedAgentLink(`${baseOrigin}/${data.agent.slug}`);
        setTimeout(() => setCreatedAgentLink(null), 10000);
      }
    } catch (err: any) {
      setCreateAgentError(err.message || 'אירעה שגיאה ביצירת הסוכן.');
    } finally {
      setCreateAgentLoading(false);
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
      setEditPhoneNumber(agent.phoneNumber || '');
      setEditStartTime(agent.startTime || '');
      setEditEndTime(agent.endTime || '');
      setEditGreeting(agent.greeting || '');
      setEditVoiceGender(agent.voiceGender || 'neutral');
      setEditVoiceName(agent.voiceName || 'alloy');
      setEditResponseLength(agent.responseLength || 'normal');
      setEditConversationStyle(agent.conversationStyle || 'professional');
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
          phoneNumber: editPhoneNumber.trim(),
          startTime: editStartTime,
          endTime: editEndTime,
          tone: editTone,
          greeting: editGreeting.trim(),
          voiceGender: editVoiceGender,
          voiceName: editVoiceName,
          responseLength: editResponseLength,
          conversationStyle: editConversationStyle
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

  // No separate login exists for the agent system.
  // Access is granted only through the main ANINO website.
  if (!isLoading && !hasMainSession) {
    return (
      <main
        dir="rtl"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0b0c10',
          color: '#ffffff',
          fontSize: '18px',
        }}
      >
        מעביר לדף הראשי...
      </main>
    );
  }

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
      <main className="dash-main">\n
          <button
            type="button"
            onClick={() => {
              setCreateAgentError(null);
              setShowCreateAgentForm(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #5eead4, #22c55e)',
              color: '#031313',
              fontWeight: 900,
              textDecoration: 'none',
              marginBottom: '16px',
              border: 0,
              cursor: 'pointer'
            }}
          >
            פתח סוכן חדש
          </button>


        {showCreateAgentForm && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto'
          ,
            paddingBottom: 96,
            WebkitOverflowScrolling: 'touch',}}>
            <form
              onSubmit={handleCreateAgent}
              dir="rtl"
              style={{
                width: 'min(720px, 100%)',
                background: '#111827',
                border: '1px solid rgba(0,209,178,0.35)',
                borderRadius: 18,
                padding: 24,
                color: '#fff',
                boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
                maxHeight: 'calc(100vh - 48px)',
                overflowY: 'auto'
              ,
                WebkitOverflowScrolling: 'touch',}}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ margin: 0 }}>פתח סוכן חדש</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAgentForm(false);
                    setCreateAgentError(null);
                  }}
                  style={{
                    background: 'transparent',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 10,
                    padding: '6px 10px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>

              <label style={{ display: 'block', marginBottom: 6 }}>שם הסוכן</label>
              <input
                value={createAgentName}
                onChange={(e) => setCreateAgentName(e.target.value)}
                placeholder="לדוגמה: סוכן קדמה"
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff' }}
              />

              <label style={{ display: 'block', marginBottom: 6 }}>מטרה / הוראות לסוכן</label>
              <textarea
                value={createAgentPurpose}
                onChange={(e) => setCreateAgentPurpose(e.target.value)}
                placeholder="לדוגמה: לענות ללקוחות, להסביר על העסק, לקבל הזמנות ולחזור ללידים."
                rows={5}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff', resize: 'vertical' }}
              />

              <label style={{ display: 'block', marginBottom: 6 }}>טלפון / שיוך, לא חובה</label>
              <input
                value={createAgentPhoneNumber}
                onChange={(e) => setCreateAgentPhoneNumber(e.target.value)}
                placeholder="לדוגמה: 0501234567"
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>שעת התחלה</label>
                  <input
                    type="time"
                    value={createAgentStartTime}
                    onChange={(e) => setCreateAgentStartTime(e.target.value)}
                    style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#0b1220', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>שעת סיום</label>
                  <input
                    type="time"
                    value={createAgentEndTime}
                    onChange={(e) => setCreateAgentEndTime(e.target.value)}
                    style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#0b1220', color: '#fff' }}
                  />
                </div>
              </div>


              <label style={{ display: 'block', marginBottom: 6 }}>דיבור</label>
              <select
                value={createAgentVoiceGender}
                onChange={(e) => {
                  const value = e.target.value;
                  setCreateAgentVoiceGender(value);
                  const selected = agentVoiceGenderOptions.find((item) => item.value === value);
                  if (selected) setCreateAgentVoiceName(selected.defaultVoice);
                }}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff' }}
              >
                {agentVoiceGenderOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <label style={{ display: 'block', marginBottom: 6 }}>קול ספציפי</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <select
                  value={createAgentVoiceName}
                  onChange={(e) => setCreateAgentVoiceName(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#0b1220', color: '#fff' }}
                >
                  {agentVoiceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => playVoicePreview(createAgentVoiceName)}
                  disabled={previewingVoice === createAgentVoiceName}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(94,234,212,0.55)',
                    background: 'rgba(94,234,212,0.12)',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: previewingVoice === createAgentVoiceName ? 'wait' : 'pointer'
                  }}
                >
                  {previewingVoice === createAgentVoiceName ? 'מנגן...' : '▶ שמע דוגמה'}
                </button>
              </div>

              <label style={{ display: 'block', marginBottom: 6 }}>ברכת פתיחה</label>
              <textarea
                value={createAgentGreeting}
                onChange={(e) => setCreateAgentGreeting(e.target.value)}
                placeholder="לדוגמה: שלום, כאן הסוכן של העסק. איך אפשר לעזור?"
                rows={3}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff', resize: 'vertical' }}
              />

              <label style={{ display: 'block', marginBottom: 6 }}>אורך תשובה</label>
              <select
                value={createAgentResponseLength}
                onChange={(e) => setCreateAgentResponseLength(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff' }}
              >
                {responseLengthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <label style={{ display: 'block', marginBottom: 6 }}>סגנון שיחה</label>
              <select
                value={createAgentConversationStyle}
                onChange={(e) => setCreateAgentConversationStyle(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff' }}
              >
                {conversationStyleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <div style={{ marginBottom: 8 }}>טון דיבור</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                {[
                  ['professional', 'מקצועי'],
                  ['friendly', 'ידידותי'],
                  ['empathetic', 'אמפתי'],
                  ['humorous', 'הומוריסטי']
                ].map(([value, label]) => (
                  <label key={value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={createAgentTone.includes(value)}
                      onChange={() => toggleCreateTone(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>

              {createAgentError && (
                <div style={{
                  color: '#fecaca',
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  padding: 10,
                  borderRadius: 10,
                  marginBottom: 14
                }}>
                  {createAgentError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={createAgentLoading}>
                  {createAgentLoading ? 'פותח סוכן...' : 'פתח סוכן חדש'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateAgentForm(false);
                    setCreateAgentError(null);
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
                    disabled={webRTCLoading || !agent?.slug}
                  >
                    {webRTCLoading ? 'מתחבר למיקרופון...' : !agent?.slug ? 'טוען סוכן...' : 'דברו עם הסוכן (בדפדפן)'}
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
                <label>מטרת השיחה / הנחיות מיוחדות לשיחה זו</label>
                <textarea 
                  value={callGoal} 
                  onChange={e => setCallGoal(e.target.value)} 
                  placeholder="למשל: לבדוק אם הוא מעוניין ברכישת מנוי חודשי..."
                  rows={4}
                  required
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
        <div
          className="modal-overlay edit-agent-modal-overlay"
          onClick={() => setShowEditModal(false)}
          style={{
            alignItems: 'flex-start',
            overflowY: 'auto',
            padding: '24px 12px 120px',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div
            className="modal-content edit-agent-modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxHeight: 'calc(100vh - 48px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="modal-header">
              <h3>עריכת פרטי סוכן</h3>
              <button onClick={() => setShowEditModal(false)} className="close-x">✕</button>
            </div>
            
            <form
              onSubmit={handleEditSubmit}
              className="modal-form edit-agent-modal-form"
              style={{ overflow: 'visible' }}
            >
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

              <label style={{ display: 'block', marginBottom: 6 }}>מטרה / הוראות לסוכן</label>
              <textarea
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                placeholder="לדוגמה: לענות ללקוחות, להסביר על העסק, לקבל הזמנות ולחזור ללידים."
                rows={5}
                required
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #334155',
                  marginBottom: 14,
                  background: '#0b1220',
                  color: '#fff',
                  resize: 'vertical'
                }}
              />

              <div className="form-group">
              <label style={{ display: 'block', marginBottom: 6 }}>טלפון / שיוך, לא חובה</label>
              <input
                value={editPhoneNumber}
                onChange={(e) => setEditPhoneNumber(e.target.value)}
                placeholder="לדוגמה: 0501234567"
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>שעת התחלה</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#0b1220', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>שעת סיום</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#0b1220', color: '#fff' }}
                  />
                </div>
              </div>

              <label style={{ display: 'block', marginBottom: 6 }}>דיבור</label>
              <select
                value={editVoiceGender}
                onChange={(e) => {
                  const value = e.target.value;
                  setEditVoiceGender(value);
                  const selected = agentVoiceGenderOptions.find((item) => item.value === value);
                  if (selected) setEditVoiceName(selected.defaultVoice);
                }}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff' }}
              >
                {agentVoiceGenderOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <label style={{ display: 'block', marginBottom: 6 }}>קול ספציפי</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <select
                  value={editVoiceName}
                  onChange={(e) => setEditVoiceName(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#0b1220', color: '#fff' }}
                >
                  {agentVoiceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => playVoicePreview(editVoiceName, editGreeting)}
                  disabled={previewingVoice === editVoiceName}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(94,234,212,0.55)',
                    background: 'rgba(94,234,212,0.12)',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: previewingVoice === editVoiceName ? 'wait' : 'pointer'
                  }}
                >
                  {previewingVoice === editVoiceName ? 'מנגן...' : '▶ שמע דוגמה'}
                </button>
              </div>

              <label style={{ display: 'block', marginBottom: 6 }}>ברכת פתיחה</label>
              <textarea
                value={editGreeting}
                onChange={(e) => setEditGreeting(e.target.value)}
                placeholder="לדוגמה: שלום, כאן הסוכן של העסק. איך אפשר לעזור?"
                rows={3}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff', resize: 'vertical' }}
              />

              <label style={{ display: 'block', marginBottom: 6 }}>אורך תשובה</label>
              <select
                value={editResponseLength}
                onChange={(e) => setEditResponseLength(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff' }}
              >
                {responseLengthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <label style={{ display: 'block', marginBottom: 6 }}>סגנון שיחה</label>
              <select
                value={editConversationStyle}
                onChange={(e) => setEditConversationStyle(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', marginBottom: 14, background: '#0b1220', color: '#fff' }}
              >
                {conversationStyleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>


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
