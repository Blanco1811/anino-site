"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Card = {
  title: string;
  description: string;
  icon: string;
  imageUrl?: string | null;
  href: string;
  color: string;
};

const defaultCards: Card[] = [
  {
    title: "סוכן AI לשיחות",
    description: "מקבל ומוציא שיחות, חוזר ללידים ומטפל בפניות.",
    icon: "📞",
    href: "/agent",
    color: "blue",
  },
  {
    title: "סוכן AI לוואטסאפ",
    description: "עונה ללקוחות, אוסף פרטים ומקדם כל פנייה.",
    icon: "💬",
    href: "/agent",
    color: "green",
  },
  {
    title: "שיווק קמפיינים ברשתות",
    description: "ניהול קמפיינים, תגובות ולידים ברשתות חברתיות.",
    icon: "📣",
    href: "#",
    color: "purple",
  },
  {
    title: "שיווק בוואטסאפ",
    description: "קמפיינים, רשימות לקוחות, הודעות ודוחות.",
    icon: "🚀",
    href: "http://staging.whatsapp.marketing.anino-ai.com",
    color: "orange",
  },
  {
    title: "שיווק במייל",
    description: "דיוורים, אוטומציות ומעקב אחרי לקוחות.",
    icon: "✉️",
    href: "#",
    color: "pink",
  },
  {
    title: "מערכת כספים",
    description: "יתרה נטענת, חיובים ודוחות במקום אחד.",
    icon: "₪",
    href: "#",
    color: "cyan",
  },
];

export default function Home() {
  const [cards, setCards] = useState<Card[]>(defaultCards);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteLanguage, setSiteLanguage] = useState('he');
  const [translatedTexts, setTranslatedTexts] = useState<Record<string, string>>({});

  const heroLabel = 'ANINO AI PLATFORM';
  const heroTitleLine1 = 'כל פתרונות ה־AI';
  const heroTitleLine2 = 'לעסק במקום אחד';
  const heroDescription = 'בחרו את המערכת המתאימה לעסק שלכם והתחילו לעבוד.';

  const translateText = (text: string) => translatedTexts[text] || text;
  const isRtlLanguage = ['he', 'ar', 'fa', 'ur'].includes(siteLanguage);

  useEffect(() => {
    fetch('/api/site-settings', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setLogoUrl(data.logoUrl || null))
      .catch(() => {});

    fetch('/api/home-cards')
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.cards) && data.cards.length > 0) {
          setCards(data.cards);
        }
      })
      .catch(() => {
        // נשארים עם קופסאות ברירת המחדל אם יש בעיית טעינה.
      });
  }, []);

  useEffect(() => {
    const languages = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];

    const detected = languages
      .map((language) => language.split('-')[0].toLowerCase())
      .find(Boolean);

    setSiteLanguage(detected || 'he');
  }, []);

  useEffect(() => {
    if (siteLanguage === 'he') {
      setTranslatedTexts({});
      return;
    }

    const texts = Array.from(
      new Set([
        heroLabel,
        heroTitleLine1,
        heroTitleLine2,
        heroDescription,
        'צור קשר',
        'כניסה',
        'תמיכה לעסקים עם פתרונות AI',
        'כל הזכויות שמורות.',
        ...cards.flatMap((card) => [card.title, card.description]),
      ])
    );

    fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts,
        sourceLanguage: 'he',
        targetLanguage: siteLanguage,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!Array.isArray(data.translations)) return;

        const nextTranslations: Record<string, string> = {};
        texts.forEach((text, index) => {
          nextTranslations[text] = data.translations[index] || text;
        });

        setTranslatedTexts(nextTranslations);
      })
      .catch(() => setTranslatedTexts({}));
  }, [siteLanguage, cards]);

  return (
    <main dir={isRtlLanguage ? 'rtl' : 'ltr'} className="page">
      <header className="header">
        <Link href="/" className="brand">
          {logoUrl ? (
            <img src={logoUrl} alt="ANINO" className="site-logo-image" />
          ) : (
            <>
              <span className="logo-icon">a</span>
              <span>ANINO</span>
            </>
          )}
        </Link>

        <a
          href="https://wa.me/972556888870?text=שלום%20אני%20מעוניין%20בפתרון%20AI%20לעסק"
          target="_blank"
          rel="noreferrer"
          className="contact-button"
        >
          {translateText('צור קשר')}
        </a>
      </header>

      <section className="hero">
        <span className="small-title">{translateText(heroLabel)}</span>

        <h1>
          {translateText(heroTitleLine1)}
          <br />
          <span>{translateText(heroTitleLine2)}</span>
        </h1>

        <p>{translateText(heroDescription)}</p>

        <nav className="category-buttons">
          {cards.map((card) => (
            <a key={card.title} href={`#card-${card.title}`}>
              {translateText(card.title)}
            </a>
          ))}
        </nav>
      </section>

      <section className="cards-section">
        <div className="cards">
          {cards.map((card) => (
            <article id={`card-${card.title}`} key={card.title} className={`card ${card.color}`}>
              <div className="card-title-row">
                <h2>{translateText(card.title)}</h2>
              </div>

              {card.imageUrl ? (
                <div className="card-image-large">
                  <img src={card.imageUrl} alt={translateText(card.title)} />
                </div>
              ) : (
                <div className="card-icon">{card.icon}</div>
              )}

              <p>{translateText(card.description)}</p>

              <a href={card.href} className="enter-button">
                {translateText('כניסה')}
              </a>
            </article>
          ))}
        </div>
      </section>



<style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }

        :global(body) {
          margin: 0;
          background: #f5f8fd;
          color: #102047;
          font-family: Arial, Helvetica, sans-serif;
        }

        .page {
          min-height: 100vh;
          padding: 20px;
          background:
            radial-gradient(circle at 85% 5%, rgba(67, 123, 255, 0.12), transparent 28rem),
            #f5f8fd;
        }

        .header {
          width: min(1180px, 100%);
          min-height: 72px;
          margin: auto;
          padding: 13px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid #e2eaf8;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.9);
        }

        .site-logo-image {
          width: 145px;
          height: 48px;
          object-fit: contain;
          display: block;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #102047;
          text-decoration: none;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .logo-icon {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          color: white;
          background: linear-gradient(135deg, #ff9b26, #ff5c00);
          font-family: Georgia, serif;
          font-size: 25px;
          font-weight: bold;
          transform: rotate(-12deg);
        }

        .contact-button {
          padding: 11px 18px;
          border-radius: 12px;
          color: white;
          background: #2363e8;
          text-decoration: none;
          font-size: 14px;
          font-weight: bold;
        }

        .hero {
          width: min(1180px, 100%);
          margin: 24px auto 45px;
          padding: 82px 30px 65px;
          text-align: center;
          border-radius: 30px;
          background: linear-gradient(140deg, #ffffff, #edf4ff);
          border: 1px solid #e2eaf8;
        }

        .small-title {
          color: #4779dd;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 18px 0;
          color: #102047;
          font-size: clamp(40px, 6vw, 70px);
          line-height: 1.05;
        }

        h1 span {
          color: #2868e9;
        }

        .hero p {
          margin: 0;
          color: #667da4;
          font-size: 18px;
        }

        .category-buttons {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          max-width: 900px;
          margin: 26px auto 0;
          padding: 0 16px;
        }

        .category-buttons a {
          padding: 10px 16px;
          border: 1px solid #bcd5ff;
          border-radius: 999px;
          background: #ffffff;
          color: #2563d9;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(47, 128, 237, 0.12);
          transition: 0.2s ease;
        }

        .category-buttons a:hover {
          background: #2f80ed;
          border-color: #2f80ed;
          color: #ffffff;
          transform: translateY(-2px);
        }

        .card {
          scroll-margin-top: 110px;
        }

        .cards-section {
          width: min(1180px, 100%);
          margin: auto;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .card {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding: 26px;
          border-radius: 26px;
          background: #ffffff;
          border: 2px solid #b8cdf7;
          box-shadow: 0 14px 32px rgba(33, 76, 160, 0.12);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .card:hover {
          transform: translateY(-4px);
          border-color: #7ea8ef;
          box-shadow: 0 18px 38px rgba(33, 76, 160, 0.18);
        }

        .card-image-large {
          width: 100%;
          height: 260px;
          margin-bottom: 22px;
          overflow: hidden;
          border-radius: 18px;
          background: #eef4ff;
        }

        .card-image-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: inherit;
          display: block;
        }

        .card-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          font-size: 30px;
        }

        .blue .card-icon {
          background: #e5eeff;
        }

        .green .card-icon {
          background: #e0f9ea;
        }

        .purple .card-icon {
          background: #f0e9ff;
        }

        .orange .card-icon {
          background: #fff0dd;
        }

        .pink .card-icon {
          background: #ffe8f0;
        }

        .cyan .card-icon {
          background: #e1f8fb;
        }

        .card-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          width: 100%;
          direction: rtl;
        }

        .card-title-logo {
          width: 82px;
          height: 32px;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .card-title-row h2 {
          margin: 0;
        }

        .card h2 {
          margin: 23px 0 10px;
          font-size: 21px;
        }

        .card p {
          margin: 0;
          color: #647a9f;
          line-height: 1.7;
          font-size: 14px;
        }

        .enter-button {
          margin-top: 16px;
          min-width: 140px;
          min-height: 46px;
          padding: 12px 24px;
          border-radius: 10px;
          background: #2f80ed;
          color: white;
          font-weight: 700;
          text-align: center;
          justify-content: center;
          box-shadow: 0 8px 18px rgba(47, 128, 237, 0.22);
        }

        .enter-button:hover {
          transform: translateY(-2px);
          background: #1769d1;
        }

        .enter-button span {
          margin-top: auto;
          padding-top: 24px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #2464e6;
          text-decoration: none;
          font-weight: 900;
        }


        .how-it-works {
          width: min(1180px, 100%);
          margin: 38px auto 42px;
          padding: 38px;
          text-align: center;
          border: 1px solid #e0e9f7;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.72);
        }

        .how-it-works h2 {
          margin: 10px 0 30px;
          color: #102047;
          font-size: clamp(27px, 3vw, 38px);
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .step {
          padding: 20px;
          border-radius: 20px;
          background: #f7faff;
        }

        .step > span {
          width: 34px;
          height: 34px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: white;
          background: #2868e9;
          font-weight: 900;
        }

        .step h3 {
          margin: 0 0 8px;
          color: #102047;
          font-size: 18px;
        }

        .step p {
          margin: 0;
          color: #647a9f;
          line-height: 1.6;
          font-size: 14px;
        }

        .contact-strip {
          width: min(1180px, 100%);
          margin: 45px auto 28px;
          padding: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          border-radius: 28px;
          color: white;
          background: linear-gradient(135deg, #173d92, #2868e9);
        }

        .contact-strip h2 {
          margin: 10px 0;
          color: white;
          font-size: clamp(25px, 3vw, 36px);
        }

        .contact-strip p {
          margin: 0;
          color: #dce8ff;
        }

        .whatsapp-button {
          flex: 0 0 auto;
          padding: 14px 20px;
          border-radius: 13px;
          color: #17664c;
          background: white;
          text-decoration: none;
          font-weight: 900;
        }

        @media (max-width: 700px) {
          .steps {
            grid-template-columns: 1fr;
          }

          .contact-strip {
            padding: 30px 24px;
            align-items: flex-start;
            flex-direction: column;
          }
        }

        footer {
          width: min(1180px, 100%);
          margin: 45px auto 10px;
          color: #8493ad;
          text-align: center;
          font-size: 13px;
        }

        @media (max-width: 850px) {
          .cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .page {
            padding: 10px;
          }

          .brand {
            font-size: 21px;
          }

          .contact-button {
            padding: 10px 13px;
            font-size: 12px;
          }

          .hero {
            padding: 58px 22px 48px;
          }

          .hero p {
            font-size: 16px;
          }

          .cards {
            grid-template-columns: 1fr;
          }

          .card-image-large {
            height: 260px;
          }

          .card-image-large img {
            object-fit: contain;
            object-position: center top;
            background: #f7faff;
          }

        }

        .new-footer {
          width: min(1180px, 100%);
          margin: 36px auto 10px;
          padding: 30px;
          border-radius: 22px;
          background: #102047;
          color: white;
        }

        .new-footer-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }

        .new-footer h2 {
          margin: 0;
          font-size: 28px;
        }

        .new-footer p {
          margin: 8px 0 0;
          color: #c9d7f4;
        }

        .new-footer-links {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .new-footer-links a {
          color: white;
          text-decoration: none;
          font-weight: 700;
        }

        .new-footer-bottom {
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.2);
          color: #c9d7f4;
          font-size: 14px;
        }

        @media (max-width: 700px) {
          .new-footer-top {
            flex-direction: column;
            align-items: flex-start;
          }
        }

      `}</style>

      <footer className="new-footer">
        <div className="new-footer-top">
          <div>
            <h2>ANINO</h2>
            <p>{translateText('תמיכה לעסקים עם פתרונות AI')}</p>
          </div>

          <div className="new-footer-links">
            <a href="https://wa.me/972556888870" target="_blank" rel="noreferrer">
              WhatsApp: 055-688-8870
            </a>
            <a href="mailto:info@anino-ai.com">info@anino-ai.com</a>
          </div>
        </div>

        <div className="new-footer-bottom">
          © {new Date().getFullYear()} ANINO AI. {translateText('כל הזכויות שמורות.')}
        </div>
      </footer>

    </main>
  );
}
