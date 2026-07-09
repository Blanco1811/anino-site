'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';

type PricingForm = {
  voiceAgentRetailPerMinute: string;
  twilioPhoneRetailPerMinute: string;
  voiceAgentEstimatedCostPerMinute: string;
  twilioPhoneEstimatedCostPerMinute: string;
  targetGrossMargin: string;
};

const initialForm: PricingForm = {
  voiceAgentRetailPerMinute: '0.00',
  twilioPhoneRetailPerMinute: '0.00',
  voiceAgentEstimatedCostPerMinute: '0.00',
  twilioPhoneEstimatedCostPerMinute: '0.00',
  targetGrossMargin: '60.00',
};

function toNumber(value: string) {
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
}

function money(value: number) {
  return `₪${Math.max(0, value).toFixed(2)}`;
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function PricingContent() {
  const { isAdmin, isLoading, adminPassword } = useAdmin();
  const [form, setForm] = useState<PricingForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAdmin || !adminPassword) {
      setLoading(false);
      return;
    }

    const loadPricing = async () => {
      try {
        const response = await fetch('/api/admin/pricing', {
          headers: {
            'X-Admin-Password': adminPassword,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'לא ניתן לטעון את התמחור.');
        }

        setForm({
          voiceAgentRetailPerMinute: data.voiceAgentRetailPerMinute ?? '0.00',
          twilioPhoneRetailPerMinute: data.twilioPhoneRetailPerMinute ?? '0.00',
          voiceAgentEstimatedCostPerMinute:
            data.voiceAgentEstimatedCostPerMinute ?? '0.00',
          twilioPhoneEstimatedCostPerMinute:
            data.twilioPhoneEstimatedCostPerMinute ?? '0.00',
          targetGrossMargin: data.targetGrossMargin ?? '60.00',
        });
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : 'לא ניתן לטעון את התמחור.'
        );
      } finally {
        setLoading(false);
      }
    };

    void loadPricing();
  }, [isAdmin, adminPassword]);

  const calculation = useMemo(() => {
    const aiRetail = toNumber(form.voiceAgentRetailPerMinute);
    const phoneRetail = toNumber(form.twilioPhoneRetailPerMinute);
    const aiCost = toNumber(form.voiceAgentEstimatedCostPerMinute);
    const phoneCost = toNumber(form.twilioPhoneEstimatedCostPerMinute);
    const targetMargin = Math.min(95, Math.max(0, toNumber(form.targetGrossMargin)));

    const browserProfit = aiRetail - aiCost;
    const twilioRetail = aiRetail + phoneRetail;
    const twilioCost = aiCost + phoneCost;
    const twilioProfit = twilioRetail - twilioCost;

    const browserMargin = aiRetail > 0 ? (browserProfit / aiRetail) * 100 : 0;
    const twilioMargin =
      twilioRetail > 0 ? (twilioProfit / twilioRetail) * 100 : 0;

    const marginDivider = 1 - targetMargin / 100;

    return {
      aiRetail,
      aiCost,
      browserProfit,
      browserMargin,
      twilioRetail,
      twilioCost,
      twilioProfit,
      twilioMargin,
      targetMargin,
      recommendedBrowser:
        marginDivider > 0 ? aiCost / marginDivider : 0,
      recommendedTwilio:
        marginDivider > 0 ? twilioCost / marginDivider : 0,
    };
  }, [form]);

  const updateField = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const key = event.target.name as keyof PricingForm;
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
    setMessage('');
  };

  const savePricing = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!adminPassword) {
      setMessage('אין הרשאת אדמין פעילה.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'לא ניתן לשמור את התמחור.');
      }

      setForm({
        voiceAgentRetailPerMinute:
          data.pricing?.voiceAgentRetailPerMinute ??
          form.voiceAgentRetailPerMinute,
        twilioPhoneRetailPerMinute:
          data.pricing?.twilioPhoneRetailPerMinute ??
          form.twilioPhoneRetailPerMinute,
        voiceAgentEstimatedCostPerMinute:
          data.pricing?.voiceAgentEstimatedCostPerMinute ??
          form.voiceAgentEstimatedCostPerMinute,
        twilioPhoneEstimatedCostPerMinute:
          data.pricing?.twilioPhoneEstimatedCostPerMinute ??
          form.twilioPhoneEstimatedCostPerMinute,
        targetGrossMargin:
          data.pricing?.targetGrossMargin ?? form.targetGrossMargin,
      });

      setMessage('התמחור נשמר בהצלחה.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'לא ניתן לשמור את התמחור.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return <div style={{ padding: 30 }}>טוען תמחור...</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 30 }} dir="rtl">
        אין גישה. התחבר קודם דרך <Link href="/admin">האדמין</Link>.
      </div>
    );
  }

  return (
    <main className="pricing-page" dir="rtl">
      <div className="top-row">
        <div>
          <Link href="/admin" className="back-link">
            ← חזרה לאדמין
          </Link>
          <h1>תמחור ורווחים</h1>
          <p>
            המחירים הם לדקה בפועל. בשיחת Twilio הלקוח יחויב על רכיב הבינה
            ועל רכיב הטלפון בנפרד.
          </p>
        </div>
      </div>

      <form onSubmit={savePricing}>
        <section className="panel">
          <h2>מחיר שהלקוח משלם</h2>

          <div className="grid">
            <label>
              מחיר שיחת AI לדקה
              <span>חל גם על שיחה בדפדפן וגם כרכיב AI בשיחת Twilio</span>
              <input
                name="voiceAgentRetailPerMinute"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.voiceAgentRetailPerMinute}
                onChange={updateField}
              />
            </label>

            <label>
              מחיר רכיב טלפון Twilio לדקה
              <span>נוסף רק בשיחת טלפון רגילה</span>
              <input
                name="twilioPhoneRetailPerMinute"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.twilioPhoneRetailPerMinute}
                onChange={updateField}
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <h2>העלות המשוערת שלך</h2>

          <div className="grid">
            <label>
              עלות AI משוערת לדקה
              <span>עלות OpenAI / מודל הקול שלך</span>
              <input
                name="voiceAgentEstimatedCostPerMinute"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.voiceAgentEstimatedCostPerMinute}
                onChange={updateField}
              />
            </label>

            <label>
              עלות Twilio משוערת לדקה
              <span>עלות הטלפון שלך מול Twilio</span>
              <input
                name="twilioPhoneEstimatedCostPerMinute"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.twilioPhoneEstimatedCostPerMinute}
                onChange={updateField}
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <h2>יעד רווח גולמי</h2>

          <label className="single-field">
            אחוז רווח גולמי רצוי
            <span>
              המחיר המומלץ מחושב לפי: עלות ÷ (1 − אחוז הרווח).
            </span>
            <input
              name="targetGrossMargin"
              type="number"
              min="0"
              max="95"
              step="0.01"
              inputMode="decimal"
              value={form.targetGrossMargin}
              onChange={updateField}
            />
          </label>
        </section>

        <section className="summary">
          <h2>חישוב רווח לדקה</h2>

          <div className="summary-grid">
            <article>
              <h3>שיחה בדפדפן</h3>
              <p>הלקוח משלם: <strong>{money(calculation.aiRetail)}</strong></p>
              <p>עלות משוערת: <strong>{money(calculation.aiCost)}</strong></p>
              <p>רווח משוער: <strong>{money(calculation.browserProfit)}</strong></p>
              <p>רווח גולמי: <strong>{percent(calculation.browserMargin)}</strong></p>
              <p className="recommended">
                מחיר מומלץ ליעד {percent(calculation.targetMargin)}:{' '}
                <strong>{money(calculation.recommendedBrowser)}</strong>
              </p>
            </article>

            <article>
              <h3>שיחת Twilio</h3>
              <p>הלקוח משלם: <strong>{money(calculation.twilioRetail)}</strong></p>
              <p>עלות משוערת: <strong>{money(calculation.twilioCost)}</strong></p>
              <p>רווח משוער: <strong>{money(calculation.twilioProfit)}</strong></p>
              <p>רווח גולמי: <strong>{percent(calculation.twilioMargin)}</strong></p>
              <p className="recommended">
                מחיר כולל מומלץ ליעד {percent(calculation.targetMargin)}:{' '}
                <strong>{money(calculation.recommendedTwilio)}</strong>
              </p>
            </article>
          </div>
        </section>

        {message && (
          <p className={message.includes('בהצלחה') ? 'success' : 'error'}>
            {message}
          </p>
        )}

        <button type="submit" disabled={saving}>
          {saving ? 'שומר...' : 'שמור תמחור'}
        </button>
      </form>

      <style jsx>{`
        .pricing-page {
          max-width: 1050px;
          margin: 0 auto;
          padding: 32px 20px 70px;
          color: #172033;
        }

        h1 {
          margin: 16px 0 8px;
          font-size: 32px;
        }

        h2 {
          margin: 0 0 22px;
          font-size: 21px;
        }

        .back-link {
          color: #2f80ed;
          text-decoration: none;
          font-weight: 700;
        }

        .panel,
        .summary {
          margin-top: 20px;
          padding: 24px;
          border: 1px solid #dce5f2;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 6px 22px rgba(34, 63, 103, 0.06);
        }

        .grid,
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 16px;
          font-weight: 800;
        }

        label span {
          color: #6b778c;
          font-size: 13px;
          font-weight: 500;
        }

        input {
          box-sizing: border-box;
          width: 100%;
          margin-top: 4px;
          padding: 13px 14px;
          border: 1px solid #cbd8e8;
          border-radius: 10px;
          font-size: 17px;
          direction: ltr;
          text-align: right;
        }

        .single-field {
          max-width: 430px;
        }

        .summary {
          background: #f5f9ff;
        }

        article {
          padding: 18px;
          border: 1px solid #d6e4f6;
          border-radius: 14px;
          background: #fff;
        }

        article h3 {
          margin-top: 0;
          font-size: 19px;
        }

        article p {
          margin: 10px 0;
        }

        .recommended {
          margin-top: 17px;
          padding-top: 14px;
          border-top: 1px solid #e3edf9;
          color: #1c5ea8;
        }

        button {
          margin-top: 24px;
          padding: 14px 25px;
          border: 0;
          border-radius: 11px;
          background: #2f80ed;
          color: #fff;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .success,
        .error {
          margin: 18px 0 0;
          padding: 12px 14px;
          border-radius: 10px;
          font-weight: 700;
        }

        .success {
          color: #146c43;
          background: #dff7e8;
        }

        .error {
          color: #b42318;
          background: #fee4e2;
        }

        @media (max-width: 700px) {
          .pricing-page {
            padding: 22px 14px 50px;
          }

          h1 {
            font-size: 27px;
          }

          .grid,
          .summary-grid {
            grid-template-columns: 1fr;
          }

          .panel,
          .summary {
            padding: 18px;
          }
        }
      `}</style>
    </main>
  );
}

export default function AdminPricingPage() {
  return (
    <AdminProvider>
      <PricingContent />
    </AdminProvider>
  );
}
