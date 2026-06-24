'use client';

import React, { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';

const RESERVED_SLUGS = new Set([
  'api',
  'login',
  'register',
  'agent',
  'admin',
  'dashboard',
  'settings'
]);

interface AgentPublicDetails {
  id: string;
  name: string;
  purpose: string;
  status: string;
  tone: string[];
  slug: string;
}

export default function PublicAgentPage() {
  const { slug } = useParams() as { slug: string };

  // 1. Enforce reserved slugs check
  if (RESERVED_SLUGS.has(slug)) {
    notFound();
  }

  const [agent, setAgent] = useState<AgentPublicDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Setup the WebRTC Hook with public endpoints
  const {
    isWebRTCOn,
    webRTCLoading,
    webRTCError,
    startCall,
    stopCall
  } = useWebRTCCall({
    sessionApiUrl: `/api/agents/by-slug/${slug}/session`,
    agentSlug: slug
  });

  useEffect(() => {
    const fetchAgent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/agents/by-slug/${slug}`);
        if (res.status === 404) {
          setError('AgentNotFound');
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to load agent details');
        }
        const data = await res.json();
        setAgent(data.agent);
      } catch (err: any) {
        setError(err.message || 'אירעה שגיאה בטעינת נתוני הסוכן.');
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [slug]);

  // Handle 404 case
  if (error === 'AgentNotFound') {
    return (
      <div className="container flex-center" dir="rtl">
        <div className="card text-center">
          <span className="error-icon">🔍</span>
          <h2>הסוכן לא נמצא</h2>
          <p className="desc">הסוכן המבוקש אינו קיים במערכת, או שהכתובת אינה נכונה.</p>
          <a href="/" className="btn-home">חזרה לדף הבית</a>
        </div>
        <style jsx>{`
          .container {
            width: 100vw;
            height: 100vh;
            background: #0b0c10;
            color: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .card {
            background: rgba(31, 40, 51, 0.6);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 40px;
            border-radius: 16px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            text-align: center;
          }
          .error-icon {
            font-size: 48px;
            display: block;
            margin-bottom: 20px;
          }
          h2 {
            color: #ef4444;
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .desc {
            color: #c5a880;
            font-size: 15px;
            margin-bottom: 25px;
            line-height: 1.5;
          }
          .btn-home {
            display: inline-block;
            background: #00D09C;
            color: #0b0c10;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            transition: all 0.2s ease;
          }
          .btn-home:hover {
            transform: translateY(-2px);
            background: #05e2ab;
          }
        `}</style>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="container flex-center">
        <div className="pulse-loader"></div>
        <p>מתחבר לסוכן הקולי...</p>
        <style jsx>{`
          .container {
            width: 100vw;
            height: 100vh;
            background: #0b0c10;
            color: #45f3ff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: system-ui, -apple-system, sans-serif;
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

  // Render main speech UI
  return (
    <div className="public-chat-screen" dir="rtl">
      {/* Mini clean header */}
      <header className="header">
        <div className="logo-area">
          <img src="/logo.png" alt="ANINO Logo" className="logo" />
          <span className="agent-title">שיחה עם סוכן AI: <strong>{agent?.name}</strong></span>
        </div>
      </header>

      {/* Main chat widget */}
      <main className="main-content">
        <div className="chat-card shadow-card">
          <div className="status-badge">
            <span className={`status-dot ${isWebRTCOn ? 'active' : ''}`}></span>
            <span>{isWebRTCOn ? 'שיחה פעילה' : 'המיקרופון מוכן'}</span>
          </div>

          <h2 className="agent-welcome">היי, אני {agent?.name}</h2>
          <p className="agent-role">{agent?.purpose}</p>

          {/* Glow visualizer sphere */}
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

          {/* Interactive triggers */}
          <div className="actions-section">
            {!isWebRTCOn ? (
              <button 
                onClick={startCall} 
                className="btn btn-primary"
                disabled={webRTCLoading}
              >
                {webRTCLoading ? 'מתחבר למיקרופון...' : 'התחל שיחה קולית'}
              </button>
            ) : (
              <button onClick={stopCall} className="btn btn-danger">
                נתק שיחה
              </button>
            )}
          </div>

          {webRTCError && <div className="error-msg">{webRTCError}</div>}
        </div>
      </main>

      <style jsx>{`
        .public-chat-screen {
          width: 100vw;
          min-height: 100vh;
          background: radial-gradient(circle at center, #1f2833 0%, #0b0c10 100%);
          color: #fff;
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          align-items: center;
          background: rgba(31, 40, 51, 0.4);
          backdrop-filter: blur(10px);
          padding: 15px 30px;
          border-bottom: 1px solid rgba(0, 208, 156, 0.15);
        }

        .logo-area {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo {
          height: 32px;
          width: auto;
        }

        .agent-title {
          font-size: 15px;
          color: #b0b0b0;
        }

        .main-content {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .chat-card {
          background: rgba(31, 40, 51, 0.55);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 40px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.3);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          color: #8892b0;
          margin-bottom: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
        }

        .status-dot.active {
          background: #00D09C;
          box-shadow: 0 0 10px #00D09C;
          animation: pulse-dot 1.5s infinite;
        }

        @keyframes pulse-dot {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }

        .agent-welcome {
          font-size: 26px;
          margin: 0 0 8px 0;
          color: #00D09C;
          font-weight: 700;
        }

        .agent-role {
          font-size: 15px;
          color: #c5a880;
          margin: 0 0 35px 0;
          line-height: 1.5;
          max-width: 90%;
        }

        .sphere-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 35px;
        }

        .sphere-glowing {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, #1f2833 30%, #0b0c10 100%);
          border: 2px solid #45f3ff;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 40px;
          box-shadow: 0 0 20px rgba(69, 243, 255, 0.25);
          transition: all 0.3s ease;
        }

        .sphere-glowing.speaking {
          border-color: #00D09C;
          box-shadow: 0 0 35px rgba(0, 208, 156, 0.6), inset 0 0 20px rgba(0, 208, 156, 0.3);
          transform: scale(1.05);
        }

        .sphere-icon {
          animation: bounce 3s infinite ease-in-out;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .wave-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 4px;
          height: 40px;
        }

        .bar {
          width: 4px;
          height: 10px;
          background-color: #00D09C;
          border-radius: 2px;
          animation: soundWave 1.2s infinite ease-in-out;
        }

        .wave-1 { animation-delay: 0.1s; height: 15px; }
        .wave-2 { animation-delay: 0.3s; height: 28px; }
        .wave-3 { animation-delay: 0.6s; height: 35px; }
        .wave-4 { animation-delay: 0.2s; height: 22px; }
        .wave-5 { animation-delay: 0.4s; height: 12px; }

        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }

        .actions-section {
          width: 100%;
          margin-bottom: 15px;
        }

        .btn {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: #00D09C;
          color: #0b0c10;
          box-shadow: 0 4px 15px rgba(0, 208, 156, 0.35);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          background: #05e2ab;
        }

        .btn-primary:disabled {
          background: #333;
          color: #777;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .btn-danger {
          background: #ef4444;
          color: #fff;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.35);
        }

        .btn-danger:hover {
          transform: translateY(-2px);
          background: #f87171;
        }

        .error-msg {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          width: 100%;
          box-sizing: border-box;
          margin-top: 15px;
        }
      `}</style>
    </div>
  );
}
