'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Transaction = {
  id: string;
  type: string;
  service: string | null;
  amount: string;
  balanceAfter: string;
  description: string;
  createdAt: string;
};

type AutoTopUp = {
  enabled: boolean;
  thresholdAmount: string;
  topUpAmount: string;
  monthlyLimitAmount: string | null;
  monthlyChargesLimit: number | null;
};

type WalletData = {
  wallet: {
    id: string;
    balance: string;
    currency: string;
  };
  autoTopUp: AutoTopUp;
  monthlyUsage: Record<string, string>;
  transactions: Transaction[];
};

const serviceLabels: Record<string, string> = {
  voice_agent: 'סוכן AI לשיחות',
  phone_call: 'שיחות טלפון (Twilio)',
  whatsapp_agent: 'סוכן AI ב־WhatsApp',
  whatsapp_marketing: 'שיווק ב־WhatsApp',
  social_marketing: 'שיווק ברשתות',
  email_marketing: 'שיווק במייל',
  phone_number: 'מספר טלפון',
  manual: 'פעולה ידנית',
};

const transactionLabels: Record<string, string> = {
  topup: 'טעינת יתרה',
  charge: 'חיוב',
  credit: 'זיכוי',
  refund: 'החזר',
};

function formatMoney(value: string | number | null) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function WalletPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAutoTopUp, setShowAutoTopUp] = useState(false);
  const [saving, setSaving] = useState(false);

  const [thresholdAmount, setThresholdAmount] = useState('20.00');
  const [topUpAmount, setTopUpAmount] = useState('100.00');
  const [monthlyLimitAmount, setMonthlyLimitAmount] = useState('');
  const [monthlyChargesLimit, setMonthlyChargesLimit] = useState('');

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      if (!isLoading) setLoadingWallet(false);
      return;
    }

    const loadWallet = async () => {
      try {
        setLoadingWallet(true);
        setError('');

        const response = await fetch('/api/wallet', {
          credentials: 'same-origin',
          cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'לא ניתן לטעון את הארנק');
        }

        setWalletData(data);
        setThresholdAmount(data.autoTopUp.thresholdAmount);
        setTopUpAmount(data.autoTopUp.topUpAmount);
        setMonthlyLimitAmount(data.autoTopUp.monthlyLimitAmount ?? '');
        setMonthlyChargesLimit(
          data.autoTopUp.monthlyChargesLimit?.toString() ?? ''
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : 'לא ניתן לטעון את הארנק'
        );
      } finally {
        setLoadingWallet(false);
      }
    };

    void loadWallet();
  }, [isLoading, isAuthenticated]);

  async function saveAutoTopUp() {
    try {
      setSaving(true);
      setError('');
      setNotice('');

      const response = await fetch('/api/wallet/auto-topup', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thresholdAmount,
          topUpAmount,
          monthlyLimitAmount: monthlyLimitAmount || null,
          monthlyChargesLimit: monthlyChargesLimit || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'לא ניתן לשמור את ההגדרות');
      }

      setWalletData((current) =>
        current ? { ...current, autoTopUp: data.autoTopUp } : current
      );
      setNotice('ההגדרות נשמרו. ההפעלה תתאפשר לאחר חיבור כרטיס מאובטח דרך Tranzila.');
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'לא ניתן לשמור את ההגדרות'
      );
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || loadingWallet) {
    return <main className="wallet-page"><p className="state">טוען את הארנק...</p></main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="wallet-page">
        <section className="login-box">
          <h1>הארנק שלי</h1>
          <p>כדי לראות יתרה והיסטוריית חיובים, פתחו חשבון או התחברו לחשבון קיים.</p>
          <div className="account-actions">
            <a href="/account?mode=register">פתיחת חשבון</a>
            <a href="/account?mode=login" className="secondary-link">כניסה ללקוח קיים</a>
          </div>
        </section>
      </main>
    );
  }

  const services = [
    'voice_agent',
    'phone_call',
    'whatsapp_agent',
    'whatsapp_marketing',
    'social_marketing',
    'email_marketing',
  ];

  return (
    <main className="wallet-page">
      <header className="topbar">
        <a href="/" className="back-link">חזרה לדף הבית</a>
        <div>
          <span className="eyebrow">ANINO ACCOUNT BALANCE</span>
          <h1>הארנק שלי</h1>
        </div>
      </header>

      {error && <p className="message error">{error}</p>}
      {notice && <p className="message success">{notice}</p>}

      <section className="balance-card">
        <div>
          <span className="balance-label">יתרה זמינה</span>
          <strong>{formatMoney(walletData?.wallet.balance ?? '0')}</strong>
          <p>כל חיוב וטעינה נשמרים בהיסטוריה האישית שלך.</p>
        </div>

        <div className="wallet-icon" aria-hidden="true">₪</div>
      </section>

      <section className="actions">
        <button
          type="button"
          onClick={() => setNotice('טעינת יתרה אמיתית תיפתח לאחר חיבור Tranzila.')}
        >
          הוספת כסף
        </button>

        <button
          type="button"
          className="secondary"
          onClick={() => setShowAutoTopUp((value) => !value)}
        >
          טעינה אוטומטית
        </button>
      </section>

      {showAutoTopUp && (
        <section className="auto-topup">
          <div>
            <span className="section-kicker">טעינה אוטומטית</span>
            <h2>שמור את ההעדפות שלך מראש</h2>
            <p>
              הטעינה נשארת כבויה עד לחיבור כרטיס מאובטח באמצעות Tranzila.
              ANINO לא ישמור מספר כרטיס או CVV.
            </p>
          </div>

          <div className="form-grid">
            <label>
              כשהיתרה יורדת מתחת ל־₪
              <input
                inputMode="decimal"
                value={thresholdAmount}
                onChange={(event) => setThresholdAmount(event.target.value)}
              />
            </label>

            <label>
              סכום הטעינה ₪
              <input
                inputMode="decimal"
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(event.target.value)}
              />
            </label>

            <label>
              תקרה חודשית ₪
              <input
                inputMode="decimal"
                placeholder="ללא תקרה"
                value={monthlyLimitAmount}
                onChange={(event) => setMonthlyLimitAmount(event.target.value)}
              />
            </label>

            <label>
              מקסימום טעינות בחודש
              <input
                inputMode="numeric"
                placeholder="ללא מגבלה"
                value={monthlyChargesLimit}
                onChange={(event) => setMonthlyChargesLimit(event.target.value)}
              />
            </label>
          </div>

          <button type="button" onClick={saveAutoTopUp} disabled={saving}>
            {saving ? 'שומר...' : 'שמירת הגדרות'}
          </button>
        </section>
      )}

      <section className="usage-section">
        <div className="section-heading">
          <span className="section-kicker">שימוש החודש</span>
          <h2>פירוט לפי שירות</h2>
        </div>

        <div className="usage-grid">
          {services.map((service) => (
            <article key={service} className="usage-item">
              <span>{serviceLabels[service]}</span>
              <strong>{formatMoney(walletData?.monthlyUsage[service] ?? '0')}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="history-section">
        <div className="section-heading">
          <span className="section-kicker">היסטוריה</span>
          <h2>טעינות, חיובים וזיכויים</h2>
        </div>

        {!walletData?.transactions.length ? (
          <p className="empty-state">עדיין אין פעולות בארנק הזה.</p>
        ) : (
          <div className="history-list">
            {walletData.transactions.map((transaction) => {
              const isPositive = ['topup', 'credit', 'refund'].includes(transaction.type);

              return (
                <article key={transaction.id} className="history-row">
                  <div>
                    <strong>{transactionLabels[transaction.type] || transaction.type}</strong>
                    <span>
                      {transaction.service
                        ? serviceLabels[transaction.service] || transaction.service
                        : transaction.description}
                    </span>
                  </div>

                  <div className="transaction-values">
                    <strong className={isPositive ? 'positive' : 'negative'}>
                      {isPositive ? '+' : '-'}{formatMoney(transaction.amount)}
                    </strong>
                    <span>
                      {new Intl.DateTimeFormat('he-IL', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(transaction.createdAt))}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <style jsx>{`
        .wallet-page {
          min-height: 100vh;
          padding: 28px 18px 60px;
          background:
            radial-gradient(circle at 84% 8%, rgba(38, 103, 232, 0.16), transparent 25rem),
            #f5f8fd;
          color: #102047;
          font-family: Arial, Helvetica, sans-serif;
        }

        .topbar,
        .balance-card,
        .actions,
        .auto-topup,
        .usage-section,
        .history-section,
        .login-box {
          width: min(1040px, 100%);
          margin-inline: auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .back-link {
          color: #2363e8;
          font-weight: 800;
          text-decoration: none;
        }

        h1, h2, p {
          margin: 0;
        }

        h1 {
          margin-top: 6px;
          font-size: clamp(30px, 5vw, 44px);
        }

        h2 {
          margin-top: 5px;
          font-size: 24px;
        }

        .eyebrow,
        .section-kicker {
          color: #4779dd;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .balance-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 26px;
          padding: 34px;
          border: 1px solid #dbe7fb;
          border-radius: 28px;
          background: linear-gradient(135deg, #ffffff, #eaf2ff);
          box-shadow: 0 18px 40px rgba(25, 74, 166, 0.1);
        }

        .balance-label {
          display: block;
          color: #52698f;
          font-weight: 800;
        }

        .balance-card strong {
          display: block;
          margin: 8px 0;
          color: #1261dd;
          font-size: clamp(38px, 6vw, 58px);
          line-height: 1;
        }

        .balance-card p,
        .auto-topup p {
          color: #607394;
          line-height: 1.7;
        }

        .wallet-icon {
          min-width: 100px;
          height: 100px;
          display: grid;
          place-items: center;
          border-radius: 30px;
          color: white;
          background: linear-gradient(135deg, #2875ef, #164cbb);
          box-shadow: 0 13px 25px rgba(32, 98, 218, 0.25);
          font-size: 52px;
          font-weight: 900;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 18px;
        }

        button,
        .login-box a {
          border: 0;
          border-radius: 13px;
          padding: 14px 21px;
          color: white;
          background: #2363e8;
          cursor: pointer;
          font: inherit;
          font-weight: 900;
          text-decoration: none;
        }

        button.secondary {
          color: #2363e8;
          border: 1px solid #bcd2ff;
          background: white;
        }

        button:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .auto-topup,
        .usage-section,
        .history-section,
        .login-box {
          margin-top: 24px;
          padding: 27px;
          border: 1px solid #e0e8f5;
          border-radius: 22px;
          background: white;
        }

        .auto-topup > div:first-child {
          margin-bottom: 20px;
        }

        .auto-topup button {
          margin-top: 20px;
        }

        .form-grid,
        .usage-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        label {
          display: grid;
          gap: 7px;
          color: #344c75;
          font-size: 14px;
          font-weight: 800;
        }

        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #cddbf0;
          border-radius: 10px;
          color: #102047;
          font: inherit;
          direction: ltr;
          text-align: right;
        }

        .section-heading {
          margin-bottom: 17px;
        }

        .usage-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 17px;
          border: 1px solid #e0e9f8;
          border-radius: 15px;
          background: #f9fbff;
        }

        .usage-item span,
        .history-row span,
        .empty-state {
          color: #627596;
        }

        .usage-item strong {
          color: #1b63d8;
          font-size: 18px;
        }

        .history-list {
          display: grid;
          gap: 10px;
        }

        .history-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 16px 0;
          border-bottom: 1px solid #e8eef8;
        }

        .history-row:last-child {
          border-bottom: 0;
        }

        .history-row > div:first-child,
        .transaction-values {
          display: grid;
          gap: 5px;
        }

        .transaction-values {
          text-align: left;
        }

        .positive {
          color: #16814b;
        }

        .negative {
          color: #c83e49;
        }

        .message,
        .state {
          width: min(1040px, 100%);
          margin: 0 auto 18px;
          padding: 13px 16px;
          border-radius: 12px;
          font-weight: 800;
        }

        .error {
          color: #a72c38;
          background: #fff0f1;
        }

        .success {
          color: #12643d;
          background: #edfff4;
        }

        .state,
        .empty-state {
          text-align: center;
        }

        .login-box {
          max-width: 520px;
          margin-top: 12vh;
          text-align: center;
        }

        .login-box p {
          margin: 14px 0 24px;
          color: #607394;
          line-height: 1.7;
        }

        .account-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .account-actions .secondary-link {
          color: #2363e8;
          border: 1px solid #bcd2ff;
          background: white;
        }

        @media (max-width: 640px) {
          .wallet-page {
            padding: 20px 14px 48px;
          }

          .topbar,
          .balance-card,
          .history-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .topbar {
            gap: 10px;
          }

          .wallet-icon {
            min-width: 76px;
            width: 76px;
            height: 76px;
            border-radius: 24px;
            font-size: 40px;
          }

          .form-grid,
          .usage-grid {
            grid-template-columns: 1fr;
          }

          .transaction-values {
            text-align: right;
          }
        }
      `}</style>
    </main>
  );
}
