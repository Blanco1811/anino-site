'use client';

import React, { useState, useEffect } from 'react';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';
import AdminLoginForm from '@/components/Admin/AdminLoginForm';
import Link from 'next/link';

function BusinessSettingsForm() {
  const { adminPassword, logout } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    description: '',
    openingHours: '',
    address: '',
    deliveryAreas: '',
    phone: '',
    whatsappNumber: '',
    menuText: '',
    faqText: '',
    agentInstructions: '',
  });

  // Load existing business profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/business', {
          headers: {
            'X-Admin-Password': adminPassword,
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.profile) {
            setFormData({
              businessName: data.profile.businessName || '',
              businessType: data.profile.businessType || '',
              description: data.profile.description || '',
              openingHours: data.profile.openingHours || '',
              address: data.profile.address || '',
              deliveryAreas: data.profile.deliveryAreas || '',
              phone: data.profile.phone || '',
              whatsappNumber: data.profile.whatsappNumber || '',
              menuText: data.profile.menuText || '',
              faqText: data.profile.faqText || '',
              agentInstructions: data.profile.agentInstructions || '',
            });
          }
        } else {
          setStatus({ type: 'error', message: 'שגיאה בטעינת נתוני העסק' });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setStatus({ type: 'error', message: 'חיבור השרת נכשל' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [adminPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch('/api/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'הגדרות העסק והסוכן נשמרו בהצלחה!' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const data = await response.json();
        setStatus({ type: 'error', message: data.error || 'שגיאה בשמירת הנתונים' });
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setStatus({ type: 'error', message: 'חיבור השרת נכשל בשמירה' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>טוען הגדרות סוכן...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 50vh;
            color: #667eea;
            font-weight: 500;
          }
          .spinner {
            border: 4px solid rgba(102, 126, 234, 0.1);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #667eea;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="settings-container" dir="rtl">
      <div className="settings-header">
        <div>
          <h1>הגדרות סוכן AI בוואטסאפ</h1>
          <p className="subtitle">הזן את פרטי העסק והנחיות השיחה עבור הסוכן החכם שלך</p>
        </div>
        <div className="header-actions">
          <Link href="/admin" className="back-link">
            חזרה ללוח בקרה
          </Link>
          <button onClick={logout} className="logout-btn">
            התנתק
          </button>
        </div>
      </div>

      {status && (
        <div className={`status-banner ${status.type}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="settings-form">
        {/* Core Info Grid */}
        <div className="section-card">
          <h2>פרטי העסק הבסיסיים</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="businessName">שם העסק *</label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
                placeholder="לדוגמה: פיצה אלפרדו"
              />
            </div>

            <div className="form-group">
              <label htmlFor="businessType">סוג העסק</label>
              <input
                type="text"
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                placeholder="לדוגמה: מסעדה איטלקית"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">טלפון ליצירת קשר</label>
              <input
                type="text"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="לדוגמה: 03-1234567"
              />
            </div>

            <div className="form-group">
              <label htmlFor="whatsappNumber">מספר וואטסאפ של העסק</label>
              <input
                type="text"
                id="whatsappNumber"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder="לדוגמה: 972501234567"
              />
            </div>
          </div>

          <div className="form-group full-width" style={{ marginTop: '1rem' }}>
            <label htmlFor="description">תיאור העסק</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="תיאור כללי של העסק, מה הוא מציע והייחודיות שלו..."
            />
          </div>
        </div>

        {/* Location & Operations */}
        <div className="section-card">
          <h2>מיקום ופעילות</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="address">כתובת פיזית</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="רחוב, עיר, קומה"
              />
            </div>

            <div className="form-group">
              <label htmlFor="openingHours">שעות פתיחה</label>
              <input
                type="text"
                id="openingHours"
                name="openingHours"
                value={formData.openingHours}
                onChange={handleChange}
                placeholder="לדוגמה: א'-ה' 09:00-19:00, יום ו' 09:00-13:00"
              />
            </div>
          </div>

          <div className="form-group full-width" style={{ marginTop: '1rem' }}>
            <label htmlFor="deliveryAreas">אזורי משלוח ומדיניות</label>
            <input
              type="text"
              id="deliveryAreas"
              name="deliveryAreas"
              value={formData.deliveryAreas}
              onChange={handleChange}
              placeholder='לדוגמה: תל אביב, רמת גן, גבעתיים. מינימום משלוח 80 ש"ח'
            />
          </div>
        </div>

        {/* Knowledge Base */}
        <div className="section-card">
          <h2>מאגר ידע ותפריטים</h2>
          <p className="field-desc">סוכן ה-AI יענה ללקוחות אך ורק על בסיס הנתונים שתזין כאן.</p>

          <div className="form-group full-width">
            <label htmlFor="menuText">תפריט / שירותים / מחירון מוצרים</label>
            <textarea
              id="menuText"
              name="menuText"
              value={formData.menuText}
              onChange={handleChange}
              rows={6}
              placeholder="פרט כאן את כל המוצרים, השירותים והמחירים של העסק שלך..."
            />
          </div>

          <div className="form-group full-width" style={{ marginTop: '1.5rem' }}>
            <label htmlFor="faqText">שאלות ותשובות נפוצות (FAQ)</label>
            <textarea
              id="faqText"
              name="faqText"
              value={formData.faqText}
              onChange={handleChange}
              rows={6}
              placeholder="שאלה: האם יש חניה? תשובה: כן, יש חניון צמוד בחינם לשעתיים הראשונות."
            />
          </div>
        </div>

        {/* Agent Persona */}
        <div className="section-card">
          <h2>הנחיות התנהגות מיוחדות לסוכן</h2>
          <p className="field-desc">קבע כללי שיחה מיוחדים, אישיות, טון דיבור או הגבלות מסוימות.</p>
          <div className="form-group full-width">
            <label htmlFor="agentInstructions">הנחיות מיוחדות</label>
            <textarea
              id="agentInstructions"
              name="agentInstructions"
              value={formData.agentInstructions}
              onChange={handleChange}
              rows={4}
              placeholder="לדוגמה: דבר בצורה חברותית ומנומסת. אל תיתן הנחות מיוזמתך אלא רק אם הלקוח מתעקש."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="submit-btn">
            {saving ? 'שומר שינויים...' : 'שמור הגדרות סוכן'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .settings-container {
          max-width: 1000px;
          margin: 2rem auto;
          padding: 0 1.5rem;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          background: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          border: 1px solid #dee2e6;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .settings-header h1 {
          font-size: 1.75rem;
          color: #1a202c;
          margin: 0 0 0.25rem 0;
        }

        .subtitle {
          color: #718096;
          margin: 0;
          font-size: 0.95rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .back-link {
          background: #f7fafc;
          border: 1px solid #cbd5e0;
          color: #4a5568;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .back-link:hover {
          background: #edf2f7;
        }

        .logout-btn {
          background: #fff5f5;
          border: 1px solid #feb2b2;
          color: #c53030;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #fed7d7;
        }

        .status-banner {
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          font-weight: 500;
          font-size: 0.95rem;
        }

        .status-banner.success {
          background: #f0fff4;
          border: 1px solid #c6f6d5;
          color: #22543d;
        }

        .status-banner.error {
          background: #fff5f5;
          border: 1px solid #fed7d7;
          color: #742a2a;
        }

        .section-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 1.75rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .section-card h2 {
          font-size: 1.25rem;
          color: #2d3748;
          margin: 0 0 1rem 0;
          border-bottom: 2px solid #edf2f7;
          padding-bottom: 0.5rem;
        }

        .field-desc {
          color: #718096;
          font-size: 0.85rem;
          margin: -0.5rem 0 1.25rem 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          font-weight: 600;
          font-size: 0.9rem;
          color: #4a5568;
        }

        .form-group input,
        .form-group textarea {
          padding: 0.625rem;
          border: 1px solid #cbd5e0;
          border-radius: 0.375rem;
          font-size: 0.95rem;
          color: #2d3748;
          background: #f7fafc;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 2rem;
        }

        .submit-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
        }

        .submit-btn:hover {
          background: #5a6fd6;
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          background: #a0aec0;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        @media (max-width: 768px) {
          .settings-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
            text-align: center;
          }

          .header-actions {
            justify-content: center;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full-width {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}

function MainAdminBusinessContent() {
  const { isAdmin, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="admin-loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>טוען עמוד ניהול...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-login-screen">
        <AdminLoginForm />
      </div>
    );
  }

  return <BusinessSettingsForm />;
}

export default function AdminBusinessPage() {
  return (
    <AdminProvider>
      <MainAdminBusinessContent />
    </AdminProvider>
  );
}
