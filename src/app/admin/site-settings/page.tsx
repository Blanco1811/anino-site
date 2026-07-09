'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';

function LogoManager() {
  const { isAdmin, isLoading, adminPassword } = useAdmin();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isAdmin || !adminPassword) return;

    fetch('/api/admin/site-settings', {
      cache: 'no-store',
      headers: {
        'X-Admin-Password': adminPassword,
      },
    })
      .then((response) => response.json())
      .then((data) => setLogoUrl(data.logoUrl || null))
      .catch(() => setMessage('שגיאה בטעינת הלוגו'));
  }, [isAdmin, adminPassword]);

  const uploadLogo = async (file: File) => {
    try {
      setUploading(true);
      setMessage('מעלה לוגו...');

      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: {
          'X-Admin-Password': adminPassword || '',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהעלאת הלוגו');
      }

      setLogoUrl(data.logoUrl);
      setMessage('הלוגו נשמר בהצלחה.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'שגיאה בהעלאת הלוגו');
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: 30 }}>טוען...</div>;
  }

  if (!isAdmin) {
    return <div style={{ padding: 30 }}>אין גישה. התחבר דרך האדמין.</div>;
  }

  return (
    <main dir="rtl" style={{ minHeight: '100vh', padding: 30, background: '#f5f8fd' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', background: 'white', padding: 28, borderRadius: 18 }}>
        <Link href="/admin" style={{ color: '#2f80ed', textDecoration: 'none' }}>
          חזרה לאדמין
        </Link>

        <h1 style={{ marginTop: 20 }}>ניהול לוגו</h1>
        <p>בחר תמונה חדשה ללוגו האתר.</p>

        <label style={{ display: 'block', marginTop: 24, fontWeight: 700 }}>
          העלאת לוגו
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'block', marginTop: 12 }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadLogo(file);
            }}
          />
        </label>

        <p style={{ color: '#65728c' }}>PNG, JPG או WEBP עד 5MB</p>

        {message && (
          <div style={{ marginTop: 16, padding: 12, background: '#eef4ff', borderRadius: 10 }}>
            {message}
          </div>
        )}

        {logoUrl && (
          <div style={{ marginTop: 24 }}>
            <strong>תצוגה מקדימה</strong>
            <div style={{ marginTop: 12, padding: 18, border: '1px solid #dce6f5', borderRadius: 14 }}>
              <img
                src={logoUrl}
                alt="לוגו ANINO"
                style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>
        )}

        {uploading && <p>מעלה...</p>}
      </div>
    </main>
  );
}

export default function SiteSettingsPage() {
  return (
    <AdminProvider>
      <LogoManager />
    </AdminProvider>
  );
}
