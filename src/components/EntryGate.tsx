'use client';

type EntryGateProps = {
  loading?: boolean;
};

export default function EntryGate({ loading = false }: EntryGateProps) {
  return (
    <main className="entry-page" dir="rtl">
      <section className="entry-card">
        <div className="entry-brand">ANINO</div>

        {loading ? (
          <p className="loading-text">טוען...</p>
        ) : (
          <>
            <span className="entry-kicker">AI BUSINESS PLATFORM</span>

            <h1>ברוכים הבאים ל־ANINO</h1>

            <p className="entry-description">
              כדי להיכנס למערכת ולנהל את פתרונות ה־AI של העסק שלכם,
              פתחו חשבון לקוח חדש או התחברו לחשבון קיים.
            </p>

            <div className="entry-actions">
              <a href="/account?mode=register" className="register-button">
                פתיחת חשבון לקוח
              </a>

              <a href="/login" className="login-button">
                כניסה ללקוח קיים
              </a>
            </div>

            <p className="entry-note">
              לכל לקוח נוצר ארנק אישי משלו, עם יתרה והיסטוריית חיובים פרטית.
            </p>

            <a
              href="https://wa.me/972556888870?text=שלום%20אני%20מעוניין%20בפתרון%20AI%20לעסק"
              target="_blank"
              rel="noreferrer"
              className="support-link"
            >
              צריכים עזרה לפני פתיחת חשבון? דברו איתנו ב־WhatsApp
            </a>
          </>
        )}

        <style jsx>{`
          .entry-page {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
            background:
              radial-gradient(circle at 84% 10%, rgba(43, 112, 237, 0.18), transparent 28rem),
              #f5f8fd;
            color: #102047;
            font-family: Arial, Helvetica, sans-serif;
          }

          .entry-card {
            width: min(540px, 100%);
            padding: 42px 34px;
            border: 1px solid #dce7f8;
            border-radius: 28px;
            background: rgba(255, 255, 255, 0.97);
            box-shadow: 0 20px 55px rgba(26, 73, 160, 0.14);
            text-align: center;
          }

          .entry-brand {
            color: #2363e8;
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 3px;
          }

          .entry-kicker {
            display: block;
            margin-top: 18px;
            color: #4c7ee2;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 1.3px;
          }

          h1 {
            margin: 12px 0;
            font-size: clamp(31px, 6vw, 43px);
          }

          .entry-description {
            margin: 0 auto;
            max-width: 430px;
            color: #617393;
            line-height: 1.8;
            font-size: 16px;
          }

          .entry-actions {
            display: grid;
            gap: 11px;
            margin-top: 28px;
          }

          .entry-actions a {
            border-radius: 13px;
            padding: 15px 18px;
            font-weight: 900;
            text-decoration: none;
          }

          .register-button {
            color: white;
            background: #2363e8;
            box-shadow: 0 9px 18px rgba(35, 99, 232, 0.2);
          }

          .login-button {
            color: #2363e8;
            border: 1px solid #bcd2ff;
            background: white;
          }

          .entry-note {
            margin: 24px 0 0;
            color: #697c9d;
            font-size: 13px;
            line-height: 1.7;
          }

          .support-link {
            display: inline-block;
            margin-top: 18px;
            color: #168451;
            font-size: 14px;
            font-weight: 800;
            text-decoration: none;
          }

          .loading-text {
            margin: 16px 0 0;
            color: #617393;
          }

          @media (max-width: 520px) {
            .entry-page {
              padding: 16px;
            }

            .entry-card {
              padding: 34px 22px;
            }
          }
        `}</style>
      </section>
    </main>
  );
}
