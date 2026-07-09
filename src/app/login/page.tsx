'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email.trim(), password);

    if (!result.success) {
      setError(result.error || 'פרטי הכניסה אינם נכונים');
      setLoading(false);
      return;
    }

    router.replace('/');
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#f7f9fc',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '430px',
          padding: '34px',
          borderRadius: '24px',
          background: '#ffffff',
          border: '1px solid #e5edf8',
          boxShadow: '0 18px 48px rgba(20, 62, 120, 0.14)',
        }}
      >
        <h1 style={{ margin: 0, color: '#173b72', fontSize: '30px' }}>
          כניסה ל־ANINO
        </h1>

        <p style={{ margin: '10px 0 28px', color: '#64748b', lineHeight: 1.6 }}>
          התחבר כדי לנהל את הסוכנים, השיווק והיתרה שלך.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#334155' }}>
            אימייל
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '13px 14px',
              marginBottom: '18px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              fontSize: '16px',
            }}
          />

          <label style={{ display: 'block', marginBottom: '8px', color: '#334155' }}>
            סיסמה
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '13px 14px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              fontSize: '16px',
            }}
          />

          {error ? (
            <p style={{ margin: '16px 0 0', color: '#c62828' }}>{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '24px',
              padding: '14px',
              border: 0,
              borderRadius: '12px',
              background: '#2f80ed',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>

        <p style={{ margin: '22px 0 0', textAlign: 'center', color: '#64748b' }}>
          עדיין אין לך חשבון?{' '}
          <a href="/account?mode=register" style={{ color: '#2f80ed', fontWeight: 700 }}>
            להרשמה
          </a>
        </p>
      </section>
    </main>
  );
}
