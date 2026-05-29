"use client";

import { useCallback, useEffect, useState } from "react";

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

function normalizeToken(input: string) {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const v = url.searchParams.get("v");
    if (v) return v;
  } catch { /* not a url */ }
  return trimmed.replace(/^.*[?&]v=/, "").split("&")[0];
}

export default function PartnerPage() {
  const [pin, setPin] = useState("");
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<VoucherInfo | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("v");
    if (v) setToken(v);
  }, []);

  const loadVoucher = useCallback(async () => {
    const t = normalizeToken(token);
    if (!t) return;
    setLoading(true);
    setStatus("");
    const res = await fetch(`/api/partner/voucher?token=${encodeURIComponent(t)}`);
    if (res.ok) {
      setInfo(await res.json());
    } else {
      setInfo(null);
      setStatus("Ваучер не найден");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) loadVoucher();
  }, [token, loadVoucher]);

  const confirm = async () => {
    const t = normalizeToken(token);
    if (!t || !pin.trim()) {
      setStatus("Введите PIN партнёра и код ваучера");
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
      setStatus(json.message ?? "Скидка применена!");
      await loadVoucher();
    } else {
      setStatus(json.message ?? "Ошибка");
    }
    setLoading(false);
  };

  return (
    <main className="container max-w-md py-8">
      <h1 className="mb-2 text-2xl font-semibold">Спутник · Партнёр</h1>
      <p className="mb-6 text-sm text-slate-600">
        Сканируйте QR клиента или вставьте код из ссылки. PIN выдаётся администратором.
      </p>

      <div className="space-y-4 rounded-3xl border bg-white p-6">
        <label className="block space-y-1 text-sm">
          PIN партнёра
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Например: MAK2026"
            className="w-full rounded-2xl border px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          Код ваучера (из QR)
          <input
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="32 символа или ссылка"
            className="w-full rounded-2xl border px-3 py-2 font-mono text-xs"
          />
        </label>

        <button
          className="w-full rounded-2xl border py-2 text-sm"
          onClick={loadVoucher}
          disabled={loading}
        >
          Проверить ваучер
        </button>

        {info && (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="font-semibold">{info.title}</p>
            <p className="text-primary">{info.partner_name}</p>
            <p className="mt-2">Клиент: <strong>{info.user_name}</strong></p>
            <p className="text-lg font-bold text-primary">Скидка: {info.user_discount_percent}%</p>
            <p className="mt-1 text-xs text-slate-500">
              Маржа партнёра: {info.total_margin_percent}% (клиенту {info.user_discount_percent}%, платформе {info.platform_fee_percent}%)
            </p>
            <p className="mt-2 text-xs">
              Статус:{" "}
              {info.status === "used" ? "✓ использован" : info.status === "expired" ? "истёк" : "активен — можно применить"}
            </p>
          </div>
        )}

        {info && info.status === "active" && (
          <button
            className="w-full rounded-2xl bg-primary py-3 text-white disabled:opacity-50"
            onClick={confirm}
            disabled={loading || !pin.trim()}
          >
            Подтвердить скидку
          </button>
        )}
      </div>

      {status && <p className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm">{status}</p>}
    </main>
  );
}
