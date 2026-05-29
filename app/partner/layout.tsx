import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Спутник — Кабинет партнёра",
  description: "Сканирование QR и подтверждение скидок для партнёров"
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
