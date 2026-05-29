"use client";

import QRCode from "react-qr-code";

type Props = {
  title: string;
  partnerName?: string;
  discountPercent: number;
  voucherUrl: string;
  status: string;
  expiresAt?: string;
  usedAt?: string;
  onClose?: () => void;
};

export function PartnerVoucherCard({
  title,
  partnerName,
  discountPercent,
  voucherUrl,
  status,
  expiresAt,
  usedAt,
  onClose
}: Props) {
  const isUsed = status === "used";
  const isExpired = status === "expired";

  return (
    <div className={`card-brand p-5 ${isUsed ? "opacity-80" : "border-2 border-accent"}`}>
      <p className="font-semibold text-primary">{title}</p>
      {partnerName && <p className="text-sm text-accent-dark">{partnerName}</p>}
      <p className="mt-2 text-2xl font-bold text-accent-dark">Скидка {discountPercent}%</p>

      {isUsed ? (
        <p className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm text-brand-muted">
          ✓ Использовано{usedAt ? ` · ${new Date(usedAt).toLocaleString("ru-RU")}` : ""}
        </p>
      ) : isExpired ? (
        <p className="mt-3 rounded-2xl bg-red-100 p-3 text-sm text-red-800">Срок действия истёк</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-brand-muted">Покажите QR сотруднику партнёра</p>
          <div className="mx-auto mt-4 w-fit rounded-2xl border-2 border-accent-light bg-white p-4">
            <QRCode value={voucherUrl} size={180} fgColor="#1A3668" bgColor="#ffffff" />
          </div>
          {expiresAt && (
            <p className="mt-3 text-center text-xs text-brand-muted">
              Действует до {new Date(expiresAt).toLocaleDateString("ru-RU")}
            </p>
          )}
        </>
      )}

      {onClose && (
        <button type="button" className="mt-4 w-full text-sm text-brand-muted underline" onClick={onClose}>
          Закрыть
        </button>
      )}
    </div>
  );
}
