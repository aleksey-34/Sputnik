"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { PartnerQrScanner } from "@/components/PartnerQrScanner";
import { useTelegramWebApp } from "@/components/useTelegramWebApp";
import { calcSettlementAmounts, formatRub } from "@/lib/utils/money";
import { normalizeVoucherToken } from "@/lib/utils/voucher";

type VoucherInfo = {
  token: string;
  status: string;
  title: string;
  partner_name?: string;
  user_name: string;
  user_discount_percent: number;
  platform_fee_percent: number;
  total_margin_percent: number;
  expires_at?: string;
  used_at?: string;
};

type Step = "pin" | "bill" | "scan" | "confirm";

const PIN_KEY = "sputnik_partner_pin";
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "WeGoWithSputnik_bot";

export default function PartnerPage() {
  const { isTelegram, WebApp } = useTelegramWebApp();
  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<VoucherInfo | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const billRub = Number(billAmount) || 0;

  const preview = useMemo(() => {
    if (!info || billRub <= 0) return null;
    return calcSettlementAmounts(billRub, info.user_discount_percent, info.platform_fee_percent);
  }, [info, billRub]);

  useEffect(() => {
    const saved = sessionStorage.getItem(PIN_KEY);
    if (saved) {
      setPin(saved);
      setStep("bill");
    }
    const params = new URLSearchParams(window.location.search);
    const v = params.get("v");
    if (v) {
      setToken(v);
      setStep("confirm");
    }
  }, []);

  const savePin = () => {
    if (!pin.trim()) {
      setStatus("Введите PIN");
      return;
    }
    sessionStorage.setItem(PIN_KEY, pin.trim());
    setStep("bill");
    setStatus("");
  };

  const fetchVoucher = useCallback(async (rawToken: string) => {
    const t = normalizeVoucherToken(rawToken);
    if (!t) return null;
    setToken(t);
    setLoading(true);
    setStatus("");
    const res = await fetch(`/api/partner/voucher?token=${encodeURIComponent(t)}`);
    if (res.ok) {
      const data = await res.json();
      setInfo(data);
      setLoading(false);
      setStep("confirm");
      return data as VoucherInfo;
    }
    setInfo(null);
    setStatus("Ваучер не найден");
    setLoading(false);
    return null;
  }, []);

  const handleScan = useCallback(async (text: string) => {
    setStatus("QR распознан...");
    await fetchVoucher(text);
  }, [fetchVoucher]);

  const confirm = async () => {
    const t = normalizeVoucherToken(token);
    if (!t || !pin.trim()) {
      setStatus("PIN не задан");
      return;
    }
    if (billRub <= 0) {
      setStatus("Укажите сумму чека");
      setStep("bill");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/partner/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t, pin: pin.trim(), billAmountRub: billRub })
    });
    const json = await res.json();
    if (res.ok) {
      setStatus(`✓ ${json.message ?? "Готово!"}`);
      setTimeout(() => {
        setInfo(null);
        setToken("");
        setBillAmount("");
        setStep("bill");
        setStatus("Можно принять следующего клиента");
      }, 3000);
    } else {
      setStatus(json.message ?? "Ошибка");
    }
    setLoading(false);
  };

  const stepLabels: Record<Step, string> = {
    pin: "1. PIN",
    bill: "2. Чек",
    scan: "3. QR",
    confirm: "4. Подтверждение"
  };

  return (
    <main className="container max-w-md py-4 pb-8">
      <BrandLogo size="sm" className="mb-4" />
      <h1 className="mb-1 text-center text-lg font-bold text-primary">Кабинет партнёра</h1>
      <p className="mb-4 text-center text-xs text-brand-muted">
        {isTelegram ? "Mini App · " : ""}
        PIN → сумма чека → QR клиента → подтверждение
      </p>

      {!isTelegram && (
        <p className="mb-4 rounded-2xl bg-accent-light p-3 text-center text-sm text-primary">
          Откройте в Telegram для удобства:{" "}
          <a href={`https://t.me/${BOT_USERNAME}?startapp=partner`} className="text-accent-dark underline">
            t.me/{BOT_USERNAME}?startapp=partner
          </a>
        </p>
      )}

      <div className="mb-4 flex gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-brand-muted">
        {(Object.keys(stepLabels) as Step[]).map(s => (
          <span
            key={s}
            className={`flex-1 rounded-full py-1 ${step === s ? "bg-primary text-white" : "bg-white"}`}
          >
            {stepLabels[s]}
          </span>
        ))}
      </div>

      <div className="card-brand space-y-4 p-5">
        {step === "pin" && (
          <>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-primary">PIN партнёра</span>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="MAK2026"
                className="w-full rounded-2xl border border-primary/20 px-3 py-2.5"
              />
            </label>
            <button type="button" className="btn-accent w-full py-3" onClick={savePin}>
              Войти
            </button>
          </>
        )}

        {step === "bill" && (
          <>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-primary">Сумма чека, ₽</span>
              <span className="block text-xs text-brand-muted">Введите до сканирования QR клиента</span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                value={billAmount}
                onChange={e => setBillAmount(e.target.value)}
                placeholder="5000"
                className="w-full rounded-2xl border border-primary/20 px-3 py-3 text-xl font-semibold"
              />
            </label>
            <button
              type="button"
              className="btn-accent w-full py-3"
              disabled={billRub <= 0}
              onClick={() => { setStep("scan"); setManualMode(false); setInfo(null); setToken(""); }}
            >
              Далее — сканировать QR
            </button>
            <button type="button" className="w-full text-xs text-brand-muted underline" onClick={() => setStep("pin")}>
              Сменить PIN
            </button>
          </>
        )}

        {step === "scan" && (
          <>
            <p className="text-sm text-primary">
              Чек: <strong>{formatRub(billRub)}</strong>
            </p>
            {!manualMode ? (
              <>
                <PartnerQrScanner active onScan={handleScan} />
                <button type="button" className="w-full text-sm underline" onClick={() => setManualMode(true)}>
                  Ввести код вручную
                </button>
              </>
            ) : (
              <>
                <input
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Код из QR"
                  className="w-full rounded-2xl border px-3 py-2 font-mono text-xs"
                />
                <button type="button" className="btn-primary w-full" onClick={() => fetchVoucher(token)} disabled={loading}>
                  Проверить
                </button>
              </>
            )}
            <button type="button" className="w-full text-sm text-brand-muted" onClick={() => setStep("bill")}>
              ← Изменить сумму
            </button>
          </>
        )}

        {step === "confirm" && info && (
          <>
            <div className={`rounded-2xl p-4 text-sm ${info.status === "used" ? "bg-slate-100" : "bg-accent-light"}`}>
              <p className="font-semibold text-primary">{info.title}</p>
              <p className="mt-1 text-primary">Клиент: <strong>{info.user_name}</strong></p>
              <p className="mt-2 text-brand-muted">Сумма чека: {formatRub(billRub)}</p>
              {preview && info.status === "active" && (
                <>
                  <p className="text-lg font-bold text-accent-dark">Скидка: −{formatRub(preview.discountAmountRub)}</p>
                  <p className="font-semibold text-primary">К оплате: {formatRub(preview.clientPaysRub)}</p>
                  <p className="mt-1 text-xs text-brand-muted">
                    Комиссия платформы: {formatRub(preview.platformFeeAmountRub)} ({info.platform_fee_percent}%)
                  </p>
                </>
              )}
              {info.status !== "active" && (
                <p className="mt-2 text-xs">{info.status === "used" ? "Уже использован" : "Недоступен"}</p>
              )}
            </div>

            {info.status === "active" && (
              <button type="button" className="btn-accent w-full py-3" onClick={confirm} disabled={loading}>
                Подтвердить скидку
              </button>
            )}
            <button type="button" className="w-full text-sm" onClick={() => { setStep("scan"); setInfo(null); setToken(""); }}>
              ← Сканировать другой QR
            </button>
          </>
        )}
      </div>

      {status && (
        <p className={`mt-4 rounded-2xl p-3 text-sm ${status.startsWith("✓") ? "bg-accent-light text-accent-dark" : "bg-white shadow-brand"}`}>
          {status}
        </p>
      )}

      {isTelegram && WebApp && (
        <button type="button" className="mt-4 w-full text-sm text-brand-muted underline" onClick={() => WebApp.close()}>
          Закрыть
        </button>
      )}
    </main>
  );
}
