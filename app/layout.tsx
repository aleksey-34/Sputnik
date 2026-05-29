import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Спутник — Шаги",
  description: "шагай больше — получай бонусы. Telegram Mini App для учёта шагов и партнёрских акций.",
  icons: { icon: "/logo.png", apple: "/logo.png" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <meta name="theme-color" content="#1A3668" />
      </head>
      <body>{children}</body>
    </html>
  );
}
