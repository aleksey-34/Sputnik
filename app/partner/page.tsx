"use client";

import { useCallback, useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { PartnerQrScanner } from "@/components/PartnerQrScanner";
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

const PIN_KEY = "sputnik_partner_pin";

export default function PartnerPage() {
  const [pin, setPin] = useState("");
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<VoucherInfo | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(PIN_KEY);
    if (saved) setPin(saved);
    const params = new URLSearchParams(window.location.search);
    const v = params.get("v");
    if (v) setToken(v);
  }, []);

  const savePin = (value: string) => {
    setPin(value);
    if (value.trim()) sessionStorage.setItem(PIN_KEY, value.trim());
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
      return data as VoucherInfo;
    }
    setInfo(null);
    setStatus("Ваучер не найден");
    setLoading(false);
    return null;
  }, []);

  useEffect(() => {
    if (token && !scanning) fetchVoucher(token);
  }, [token, scanning, fetchVoucher]);

  const handleScan = useCallback(async (text: string) => {
    setScanning(false);
    setStatus("QR распознан, проверяем...");
    const data = await fetchVoucher(text);
    if (data?.status === "active" && pin.trim()) {
      setStatus(`Клиент: ${data.user_name}, скидка ${data.user_discount_percent}%. Нажмите «Подтвердить».`);
    }
  }, [fetchVoucher, pin]);

  const confirm = async () => {
    const t = normalizeVoucherToken(token);
    if (!t || !pin.trim()) {
      setStatus("Сначала введите PIN партнёра");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/partner/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t, pin: pin.trim() })
    });
    const json = await res.json();
    if (res.ok) {
      setStatus(`✓ ${json.message ?? "Скидка применена!"}`);
      await fetchVoucher(t);
      setTimeout(() => {
        setInfo(null);
        setToken("");
        setScanning(true);
        setStatus("Готов к следующему клиенту — сканируйте QR");
      }, 2500);
    } else {
      setStatus(json.message ?? "Ошибка");
    }
    setLoading(false);
  };

  const startScanning = () => {
    if (!pin.trim()) {
      setStatus("Введите PIN партнёра");
      return;
    }
    sessionStorage.setItem(PIN_KEY, pin.trim());
    setManualMode(false);
    setScanning(true);
    setInfo(null);
    setToken("");
    setStatus("");
  };

  return (
    <main className="container max-w-md py-6">
      <BrandLogo size="sm" className="mb-6" />
      <h1 className="mb-1 text-center text-lg font-bold text-primary">Кабинет партнёра</h1>
      <p className="mb-6 text-center text-sm text-brand-muted">
        Сканируйте QR клиента — скидка спишется автоматически после подтверждения
      </p>

      <div className="card-brand space-y-4 p-5">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-primary">PIN партнёра</span>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => savePin(e.target.value)}
            placeholder="Например: MAK2026"
            className="w-full rounded-2xl border border-primary/20 px-3 py-2.5 focus:border-accent focus:outline-none"
          />
        </label>

        {!manualMode && (
          <>
            {!scanning ? (
              <button type="button" className="w-full btn-accent py-3" onClick={startScanning}>
                Сканировать QR клиента
              </button>
            ) : (
              <>
                <PartnerQrScanner active={scanning} onScan={handleScan} />
                <button
                  type="button"
                  className="w-full rounded-2xl border border-primary/20 py-2 text-sm text-brand-muted"
                  onClick={() => setScanning(false)}
                >
                  Закрыть камеру
                </button>
              </>
            )}
          </>
        )}

        <button
          type="button"
          className="w-full text-sm text-brand-muted underline"
          onClick={() => { setManualMode(m => !m); setScanning(false); }}
        >
          {manualMode ? "← Вернуться к сканеру" : "Ввести код вручную"}
        </button>

        {manualMode && (
          <>
            <input
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Код или ссылка из QR"
              className="w-full rounded-2xl border border-primary/20 px-3 py-2 font-mono text-xs"
            />
            <button type="button" className="btn-primary w-full" onClick={() => fetchVoucher(token)} disabled={loading}>
              Проверить
            </button>
          </>
        )}

        {info && (
          <div className={`rounded-2xl p-4 text-sm ${info.status === "used" ? "bg-slate-100" : "bg-accent-light"}`}>
            <p className="font-semibold text-primary">{info.title}</p>
            {info.partner_name && <p className="text-accent-dark">{info.partner_name}</p>}
            <p className="mt-2 text-primary">Клиент: <strong>{info.user_name}</strong></p>
            <p className="text-2xl font-bold text-accent-dark">−{info.user_discount_percent}%</p>
            <p className="mt-2 text-xs text-brand-muted">
              {info.status === "used"
                ? `✓ Использовано${info.used_at ? ` · ${new Date(info.used_at).toLocaleString("ru-RU")}` : ""}`
                : info.status === "expired"
                  ? "Срок истёк"
                  : "Активен — подтвердите скидку"}
            </p>
          </div>
        )}

        {info && info.status === "active" && (
          <button
            type="button"
            className="btn-accent w-full py-3 text-base"
            onClick={confirm}
            disabled={loading || !pin.trim()}
          >
            Подтвердить скидку {info.user_discount_percent}%
          </button>
        )}
      </div>

      {status && (
        <p className={`mt-4 rounded-2xl p-3 text-sm ${status.startsWith("✓") ? "bg-accent-light text-accent-dark" : "bg-white text-primary shadow-brand"}`}>
          {status}
        </p>
      )}

      {loading && <p className="mt-2 text-center text-sm text-brand-muted">Загрузка...</p>}
    </main>
  );
}
