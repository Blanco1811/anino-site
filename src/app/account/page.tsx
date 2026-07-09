'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'register' | 'login';

export default function AccountPage({
  initialMode = 'register',
}: {
  initialMode?: Mode;
}) {
  const { isAuthenticated, isLoading, login } = useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get('mode');

    if (requestedMode === 'login' || requestedMode === 'register') {
      setMode(requestedMode);
      return;
    }

    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.replace('/');
    }
  }, [isAuthenticated, isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await login(email, password);

        if (!result.success) {
          throw new Error(result.error || 'ההתחברות נכשלה');
        }

        window.location.href = '/';
        return;
      }

      const response = await fetch('/api/register', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'פתיחת החשבון נכשלה');
      }

      window.location.href = '/';
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'אירעה שגיאה. נסו שוב.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (isLoading || isAuthenticated) {
    return <main className="account-page"><p>טוען...</p></main>;
  }

  return (
    <main className="account-page">
      <section className="account-card">
        <a href="/" className="back-link">חזרה לאתר</a>

        <div className="brand">ANINO</div>

        <h1>{mode === 'register' ? 'פתיחת חשבון לקוח' : 'כניסה ללקוח קיים'}</h1>

        <p className="subtitle">
          {mode === 'register'
            ? 'פתחו חשבון ותתחילו לנהל את כל פתרונות ה־AI שלכם במקום אחד.'
            : 'התחברו לחשבון שלכם והמשיכו בדיוק מהמקום שבו עצרתם.'}
        </p>

        <div className="mode-buttons">
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            פתיחת חשבון
          </button>

          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            כניסה
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="two-columns">
                <label>
                  שם פרטי
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                    autoComplete="given-name"
                  />
                </label>

                <label>
                  שם משפחה
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                    autoComplete="family-name"
                  />
                </label>
              </div>

              <label>
                מספר טלפון
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="05X-XXXXXXX"
                  autoComplete="tel"
                />
              </label>
            </>
          )}

          <label>
            אימייל
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              dir="ltr"
            />
          </label>

          <label>
            סיסמה
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="לפחות 8 תווים"
              required
              minLength={8}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              dir="ltr"
            />
          </label>

          <button className="submit-button" type="submit" disabled={loading}>
            {loading
              ? 'רגע...'
              : mode === 'register'
                ? 'פתיחת חשבון וכניסה'
                : 'כניסה לחשבון'}
          </button>
        </form>

        <p className="switch-text">
          {mode === 'register' ? 'כבר יש לכם חשבון?' : 'עדיין אין לכם חשבון?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'register' ? 'login' : 'register');
              setError('');
            }}
          >
            {mode === 'register' ? 'כניסה' : 'פתיחת חשבון'}
          </button>
        </p>
      </section>

      <style jsx>{`
        .account-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 28px 16px;
          background:
            radial-gradient(circle at 85% 10%, rgba(43, 112, 237, 0.16), transparent 28rem),
            #f5f8fd;
          color: #102047;
          font-family: Arial, Helvetica, sans-serif;
        }

        .account-card {
          width: min(520px, 100%);
          padding: 34px;
          border: 1px solid #dce7f8;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 20px 50px rgba(26, 73, 160, 0.13);
        }

        .back-link {
          color: #2867dd;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
        }

        .brand {
          margin-top: 26px;
          color: #2363e8;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        h1 {
          margin: 12px 0 8px;
          font-size: 31px;
        }

        .subtitle {
          margin: 0 0 24px;
          color: #617393;
          line-height: 1.65;
        }

        .mode-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 5px;
          margin-bottom: 22px;
          border-radius: 14px;
          background: #eef4ff;
        }

        .mode-buttons button {
          border: 0;
          border-radius: 10px;
          padding: 11px;
          color: #587097;
          background: transparent;
          cursor: pointer;
          font: inherit;
          font-weight: 800;
        }

        .mode-buttons button.active {
          color: white;
          background: #2363e8;
          box-shadow: 0 5px 12px rgba(35, 99, 232, 0.22);
        }

        form {
          display: grid;
          gap: 15px;
        }

        .two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        label {
          display: grid;
          gap: 7px;
          color: #354e79;
          font-size: 14px;
          font-weight: 800;
        }

        input {
          width: 100%;
          padding: 13px;
          border: 1px solid #cbdaf0;
          border-radius: 11px;
          outline: none;
          color: #102047;
          background: white;
          font: inherit;
        }

        input:focus {
          border-color: #2363e8;
          box-shadow: 0 0 0 3px rgba(35, 99, 232, 0.1);
        }

        .submit-button {
          margin-top: 5px;
          border: 0;
          border-radius: 12px;
          padding: 14px;
          color: white;
          background: #2363e8;
          cursor: pointer;
          font: inherit;
          font-weight: 900;
        }

        .submit-button:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .error-message {
          margin: 0 0 16px;
          padding: 12px;
          border-radius: 10px;
          color: #a52838;
          background: #fff0f2;
          font-weight: 700;
        }

        .switch-text {
          margin: 22px 0 0;
          color: #637594;
          text-align: center;
        }

        .switch-text button {
          border: 0;
          color: #2363e8;
          background: transparent;
          cursor: pointer;
          font: inherit;
          font-weight: 900;
        }

        @media (max-width: 520px) {
          .account-card {
            padding: 25px 20px;
          }

          .two-columns {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
