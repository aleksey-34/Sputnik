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
    <div className={`rounded-3xl border-2 p-5 ${isUsed ? "border-slate-300 bg-slate-50" : "border-primary bg-white"}`}>
      <p className="font-semibold">{title}</p>
      {partnerName && <p className="text-sm text-primary">{partnerName}</p>}
      <p className="mt-2 text-2xl font-bold text-primary">Скидка {discountPercent}%</p>

      {isUsed ? (
        <p className="mt-3 rounded-2xl bg-slate-200 p-3 text-sm">
          ✓ Использовано{usedAt ? ` · ${new Date(usedAt).toLocaleString("ru-RU")}` : ""}
        </p>
      ) : isExpired ? (
        <p className="mt-3 rounded-2xl bg-red-100 p-3 text-sm text-red-800">Срок действия истёк</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-600">Покажите QR сотруднику партнёра</p>
          <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-4 shadow-inner">
            <QRCode value={voucherUrl} size={180} />
          </div>
          <p className="mt-3 break-all text-center text-xs text-slate-400">{voucherUrl}</p>
          {expiresAt && (
            <p className="mt-2 text-center text-xs text-slate-500">
              Действует до {new Date(expiresAt).toLocaleDateString("ru-RU")}
            </p>
          )}
        </>
      )}

      {onClose && (
        <button className="mt-4 w-full text-sm underline" onClick={onClose}>Закрыть</button>
      )}
    </div>
  );
}
