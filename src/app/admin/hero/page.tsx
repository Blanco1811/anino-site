'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';

type HeroData = {
  heroLabel: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroDescription: string;
};

const defaults: HeroData = {
  heroLabel: 'ANINO AI PLATFORM',
  heroTitleLine1: 'כל פתרונות ה־AI',
  heroTitleLine2: 'לעסק במקום אחד',
  heroDescription: 'בחרו את המערכת המתאימה לעסק שלכם והתחילו לעבוד.',
};

function HeroManager() {
  const { isAdmin, isLoading, adminPassword } = useAdmin();
  const [hero, setHero] = useState<HeroData>(defaults);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAdmin || !adminPassword) return;

    fetch('/api/admin/site-settings', {
      cache: 'no-store',
      headers: {
        'X-Admin-Password': adminPassword,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setHero({
          heroLabel: data.heroLabel || defaults.heroLabel,
          heroTitleLine1: data.heroTitleLine1 || defaults.heroTitleLine1,
          heroTitleLine2: data.heroTitleLine2 || defaults.heroTitleLine2,
          heroDescription: data.heroDescription || defaults.heroDescription,
        });
      })
      .catch(() => setMessage('שגיאה בטעינת הפתיח'));
  }, [isAdmin, adminPassword]);

  const saveHero = async () => {
    try {
      setMessage('שומר...');

      const response = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword || '',
        },
        body: JSON.stringify(hero),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשמירה');
      }

      setMessage('הפתיח נשמר בהצלחה.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'שגיאה בשמירה');
    }
  };

  if (isLoading) return <div style={{ padding: 30 }}>טוען...</div>;
  if (!isAdmin) return <div style={{ padding: 30 }}>אין גישה. התחבר דרך האדמין.</div>;

  return (
    <main dir="rtl" style={{ minHeight: '100vh', padding: 30, background: '#f5f8fd' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', background: 'white', padding: 28, borderRadius: 18 }}>
        <Link href="/admin" style={{ color: '#2f80ed', textDecoration: 'none' }}>
          חזרה לאדמין
        </Link>

        <h1 style={{ marginTop: 20 }}>ניהול פתיח ראשי</h1>
        <p>שינוי הכותרת והטקסט בחלק העליון של דף הבית.</p>

        <div style={{ display: 'grid', gap: 18, marginTop: 26 }}>
          <label>
            כותרת קטנה
            <input
              value={hero.heroLabel}
              onChange={(e) => setHero({ ...hero, heroLabel: e.target.value })}
              style={{ width: '100%', marginTop: 8, padding: 12 }}
            />
          </label>

          <label>
            שורת כותרת ראשונה
            <input
              value={hero.heroTitleLine1}
              onChange={(e) => setHero({ ...hero, heroTitleLine1: e.target.value })}
              style={{ width: '100%', marginTop: 8, padding: 12 }}
            />
          </label>

          <label>
            שורת כותרת שנייה
            <input
              value={hero.heroTitleLine2}
              onChange={(e) => setHero({ ...hero, heroTitleLine2: e.target.value })}
              style={{ width: '100%', marginTop: 8, padding: 12 }}
            />
          </label>

          <label>
            תיאור
            <textarea
              value={hero.heroDescription}
              onChange={(e) => setHero({ ...hero, heroDescription: e.target.value })}
              style={{ width: '100%', minHeight: 100, marginTop: 8, padding: 12 }}
            />
          </label>

          <button
            onClick={saveHero}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '14px 20px',
              background: '#16a35a',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            שמור שינויים
          </button>

          {message && <div style={{ padding: 12, background: '#eef4ff', borderRadius: 10 }}>{message}</div>}
        </div>
      </div>
    </main>
  );
}

export default function HeroPage() {
  return (
    <AdminProvider>
      <HeroManager />
    </AdminProvider>
  );
}
