'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';

type HomeCard = {
  id: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string | null;
  imageName?: string;
  href: string;
  color: string;
  sortOrder: number;
  isVisible: boolean;
};

const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'cyan'];

function HomeCardsManager() {
  const { isAdmin, isLoading, adminPassword } = useAdmin();
  const [cards, setCards] = useState<HomeCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [message, setMessage] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    'X-Admin-Password': adminPassword || '',
  };

  const loadCards = async () => {
    try {
      setLoadingCards(true);

      const response = await fetch('/api/admin/home-cards', {
        headers: {
          'X-Admin-Password': adminPassword || '',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בטעינת הקופסאות');
      }

      setCards(
        [...(data.cards || [])].sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        )
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'שגיאה בטעינה');
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    if (isAdmin && adminPassword) {
      loadCards();
    }
  }, [isAdmin, adminPassword]);

  const updateCard = (id: string, field: keyof HomeCard, value: string | boolean) => {
    setCards((currentCards) =>
      currentCards.map((card) =>
        card.id === id ? { ...card, [field]: value } : card
      )
    );
  };

  const uploadImage = async (id: string, file: File) => {
    try {
      setMessage('מעלה תמונה...');

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/admin/home-cards/upload', {
        method: 'POST',
        headers: {
          'X-Admin-Password': adminPassword || '',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהעלאת התמונה');
      }

      updateCard(id, 'imageUrl', data.imageUrl);
      updateCard(id, 'imageName', file.name);
      setMessage('התמונה עלתה. לחץ שמור שינויים.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'שגיאה בהעלאת תמונה');
    }
  };

  const addCard = async () => {
    try {
      const response = await fetch('/api/admin/home-cards', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהוספת קופסה');
      }

      setCards((currentCards) => [...currentCards, data.card]);
      setMessage('נוספה קופסה חדשה. ערוך אותה ולחץ שמור.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'שגיאה בהוספה');
    }
  };

  const saveCards = async () => {
    try {
      setMessage('שומר...');

      const response = await fetch('/api/admin/home-cards', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ cards }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשמירה');
      }

      setMessage('נשמר בהצלחה.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'שגיאה בשמירה');
    }
  };

  const deleteCard = async (id: string) => {
    if (!window.confirm('למחוק את הקופסה הזאת?')) return;

    try {
      const response = await fetch(`/api/admin/home-cards?id=${id}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Password': adminPassword || '',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה במחיקה');
      }

      setCards((currentCards) => currentCards.filter((card) => card.id !== id));
      setMessage('הקופסה נמחקה.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'שגיאה במחיקה');
    }
  };

  const moveCard = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= cards.length) return;

    const updatedCards = [...cards];
    [updatedCards[index], updatedCards[newIndex]] = [
      updatedCards[newIndex],
      updatedCards[index],
    ];

    setCards(updatedCards);
  };

  if (isLoading) {
    return <div className="screen-message">טוען...</div>;
  }

  if (!isAdmin) {
    return <div className="screen-message">אין גישה. התחבר קודם דרך עמוד האדמין.</div>;
  }

  return (
    <main dir="rtl" className="page">
      <div className="topbar">
        <div>
          <h1>ניהול קופסאות דף הבית</h1>
          <p>אפשר להוסיף, למחוק, להסתיר ולשנות את סדר הקופסאות באתר הראשי.</p>
        </div>

        <div className="actions">
          <Link href="/admin" className="back-button">חזרה לאדמין</Link>
          <button onClick={addCard} className="add-button">+ הוסף קופסה</button>
          <button onClick={saveCards} className="save-button">שמור שינויים</button>
        </div>
      </div>

      {message && <div className="message">{message}</div>}

      {loadingCards ? (
        <div className="screen-message">טוען קופסאות...</div>
      ) : cards.length === 0 ? (
        <div className="empty">
          אין עדיין קופסאות בדאטה־בייס. לחץ “הוסף קופסה”.
        </div>
      ) : (
        <div className="cards-list">
          {cards.map((card, index) => (
            <section key={card.id} className="card-editor">
              <div className="card-editor-header">
                <strong>קופסה {index + 1}</strong>

                <div className="mini-actions">
                  <button onClick={() => moveCard(index, -1)} disabled={index === 0}>↑</button>
                  <button onClick={() => moveCard(index, 1)} disabled={index === cards.length - 1}>↓</button>
                  <button onClick={() => deleteCard(card.id)} className="delete-button">מחק</button>
                </div>
              </div>

              <div className="fields">
                <label>
                  כותרת
                  <input
                    value={card.title}
                    onChange={(event) => updateCard(card.id, 'title', event.target.value)}
                  />
                </label>

                <label>
                  אייקון
                  <input
                    value={card.icon}
                    onChange={(event) => updateCard(card.id, 'icon', event.target.value)}
                  />
                </label>

                <label>
                  העלאת תמונה
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadImage(card.id, file);
                    }}
                  />
                  <small>JPG, PNG, WEBP או GIF עד 5MB</small>
                  {card.imageName && (
                    <strong className="selected-image-name">
                      תמונה שנבחרה: {card.imageName}
                    </strong>
                  )}
                  {card.imageUrl && (
                    <img
                      src={card.imageUrl}
                      alt="תצוגה מקדימה"
                      className="image-preview"
                    />
                  )}
                </label>

                <label>
                  קישור כפתור כניסה
                  <input
                    value={card.href}
                    onChange={(event) => updateCard(card.id, 'href', event.target.value)}
                  />
                </label>

                <label>
                  צבע
                  <select
                    value={card.color}
                    onChange={(event) => updateCard(card.id, 'color', event.target.value)}
                  >
                    {colors.map((color) => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </label>

                <label className="description-field">
                  תיאור
                  <textarea
                    value={card.description}
                    onChange={(event) => updateCard(card.id, 'description', event.target.value)}
                  />
                </label>

                <label className="visible-toggle">
                  <input
                    type="checkbox"
                    checked={card.isVisible}
                    onChange={(event) => updateCard(card.id, 'isVisible', event.target.checked)}
                  />
                  הצג את הקופסה באתר
                </label>
              </div>
            </section>
          ))}
        </div>
      )}

      <style jsx>{`
        :global(body) {
          margin: 0;
          background: #f5f8fd;
          font-family: Arial, Helvetica, sans-serif;
          color: #102047;
        }

        .page {
          min-height: 100vh;
          padding: 32px;
          background: #f5f8fd;
        }

        .topbar {
          max-width: 1100px;
          margin: 0 auto 22px;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: center;
          background: white;
          border: 1px solid #dce6f5;
          border-radius: 18px;
        }

        h1 {
          margin: 0 0 8px;
          font-size: 28px;
        }

        p {
          margin: 0;
          color: #60708f;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        button,
        .back-button {
          border: 0;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .back-button {
          background: #e8eef8;
          color: #223b69;
        }

        .add-button {
          background: #2f80ed;
          color: white;
        }

        .save-button {
          background: #16a35a;
          color: white;
        }

        .message,
        .empty,
        .screen-message {
          max-width: 1100px;
          margin: 0 auto 18px;
          padding: 16px;
          border-radius: 12px;
          background: white;
          border: 1px solid #dce6f5;
        }

        .cards-list {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .card-editor {
          background: white;
          border: 1px solid #dce6f5;
          border-radius: 16px;
          overflow: hidden;
        }

        .card-editor-header {
          padding: 15px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f7faff;
          border-bottom: 1px solid #e4ebf6;
        }

        .mini-actions {
          display: flex;
          gap: 8px;
        }

        .mini-actions button {
          padding: 8px 11px;
          background: #e8eef8;
          color: #183968;
        }

        .mini-actions button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .mini-actions .delete-button {
          background: #fee2e2;
          color: #b42318;
        }

        .fields {
          padding: 18px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-weight: 700;
          color: #24375f;
        }

        input,
        textarea,
        select {
          width: 100%;
          padding: 11px;
          border: 1px solid #cfdced;
          border-radius: 9px;
          font: inherit;
          color: #102047;
          background: white;
        }

        textarea {
          min-height: 88px;
          resize: vertical;
        }

        .image-preview {
          width: 100%;
          max-width: 100%;
          height: 240px;
          object-fit: contain;
          border-radius: 14px;
          border: 1px solid #cfdced;
          display: block;
          background: #f5f8fd;
          padding: 8px;
        }

        small {
          color: #60708f;
          font-weight: 400;
        }

        .selected-image-name {
          color: #16803c;
          font-size: 14px;
          word-break: break-word;
        }

        .description-field {
          grid-column: 1 / -1;
        }

        .visible-toggle {
          flex-direction: row;
          align-items: center;
          grid-column: 1 / -1;
        }

        .visible-toggle input {
          width: auto;
        }

        @media (max-width: 700px) {
          .page {
            padding: 14px;
          }

          .topbar {
            align-items: stretch;
            flex-direction: column;
          }

          .actions {
            flex-direction: column;
          }

          .fields {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

    </main>
  );
}

export default function HomeCardsPage() {
  return (
    <AdminProvider>
      <HomeCardsManager />
    </AdminProvider>
  );
}
