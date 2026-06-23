import type { Metadata } from "next";
import "./globals.css";
import ClientWrapper from "./client-wrapper";

export const metadata: Metadata = {
  title: "ANINO AI — סוכן AI שמביא לקוחות ומנהל פניות לעסק 24/7",
  description: "מערכת AI לעסקים שעונה בוואטסאפ, מקבלת ומוציאה שיחות, חוזרת ללידים, שולחת מיילים ומנהלת קמפיינים ברשתות.",
  keywords: ["anino", "anino ai", "סוכן ai", "סוכן וואטסאפ", "סוכן שיחות", "שיווק בוואטסאפ", "ניהול לידים", "יתרה נטענת", "בינה מלאכותית לעסקים"],
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        className="antialiased"
      >
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
