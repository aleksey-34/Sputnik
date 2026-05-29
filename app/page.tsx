"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleFitUserGuide } from "@/components/GoogleFitUserGuide";

type Tab = "user" | "shop" | "showcase";

type UserProfile = {
  id: number;
  telegram_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  gender?: string;
  birth_year?: number;
  height_cm?: number;
  weight_kg?: number;
};

type PromoCode = {
  id: number;
  code: string;
  title: string;
  description?: string;
  kind: string;
  partner_name?: string;
  cost_points: number;
  reward_points: number;
  discount_percent: number;
  user_cashback_percent: number;
  platform_fee_percent: number;
  required_steps: number;
  active: boolean;
  redeemed_at?: string;
};

type AppConfig = {
  stepsPerBonus: number;
  referralBonus: number;
  about: { title: string; description: string; rules: string[] };
};

type ProfileForm = { gender: string; height_cm: string; weight_kg: string; birth_year: string };

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

const formatSteps = (n: number) => new Intl.NumberFormat("ru-RU").format(n);
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "WeGoWithSputnik_bot";

const TABS: { id: Tab; label: string }[] = [
  { id: "user", label: "Профиль" },
  { id: "shop", label: "Магазин" },
  { id: "showcase", label: "Активности" }
];

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("user");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [profileComplete, setProfileComplete] = useState(false);
  const [stepsToday, setStepsToday] = useState(0);
  const [verifiedSteps, setVerifiedSteps] = useState(0);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [shopPromos, setShopPromos] = useState<PromoCode[]>([]);
  const [showcasePromos, setShowcasePromos] = useState<PromoCode[]>([]);
  const [redeemed, setRedeemed] = useState<PromoCode[]>([]);
  const [profileForm, setProfileForm] = useState<ProfileForm>({ gender: "", height_cm: "", weight_kg: "", birth_year: "" });
  const [manualSteps, setManualSteps] = useState("");
  const [syncPeriod, setSyncPeriod] = useState<"today" | "7d" | "30d">("today");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  const [lastSync, setLastSync] = useState<{ at: string; steps: number } | null>(null);
  const [status, setStatus] = useState("");
  const [activationBanner, setActivationBanner] = useState<{ title: string; code: string; detail: string } | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/config");
    if (res.ok) setAppConfig(await res.json());
  }, []);

  const fetchRedeemed = useCallback(async () => {
    const res = await fetch("/api/promocodes/redeemed");
    if (res.ok) setRedeemed(await res.json());
  }, []);

  const fetchSyncStatus = useCallback(async () => {
    const res = await fetch("/api/steps/sync");
    if (res.ok) {
      const json = await res.json();
      setGoogleConnected(Boolean(json.connected));
      setGoogleConfigured(json.googleConfigured !== false);
      if (json.lastSync) setLastSync({ at: json.lastSync.at, steps: json.lastSync.steps });
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (res.ok) {
      const json = await res.json();
      setProfile(json.profile ?? null);
      setBonusPoints(json.points ?? 0);
      setStepsToday(json.stepsToday ?? 0);
      setVerifiedSteps(json.verifiedSteps ?? 0);
      setProfileComplete(Boolean(json.profileComplete));
      if (json.profile) {
        setProfileForm(prev => ({
          ...prev,
          gender: json.profile.gender ?? prev.gender,
          height_cm: json.profile.height_cm != null ? String(json.profile.height_cm) : prev.height_cm,
          weight_kg: json.profile.weight_kg != null ? String(json.profile.weight_kg) : prev.weight_kg,
          birth_year: json.profile.birth_year != null ? String(json.profile.birth_year) : prev.birth_year
        }));
      }
    }
  }, []);

  const fetchPromos = useCallback(async () => {
    const [shop, showcase] = await Promise.all([
      fetch("/api/promocodes?kind=bonus_shop").then(r => r.ok ? r.json() : []),
      fetch("/api/promocodes?kind=showcase").then(r => r.ok ? r.json() : [])
    ]);
    setShopPromos(shop);
    setShowcasePromos(showcase);
  }, []);

  const loginWithTelegram = useCallback(async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setStatus("Откройте приложение в Telegram."); return; }
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData })
    });
    if (res.ok) { await fetchProfile(); await fetchRedeemed(); }
  }, [fetchProfile, fetchRedeemed]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initData) { setIsTelegram(true); tg.ready(); tg.expand(); loginWithTelegram(); }
    fetchConfig(); fetchPromos(); fetchSyncStatus();
  }, [fetchConfig, fetchPromos, fetchSyncStatus, loginWithTelegram]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      fetchSyncStatus(); fetchProfile();
      setStatus(params.get("autosync") === "1"
        ? "Google Fit подключён! Шаги за сегодня синхронизированы."
        : "Google Fit подключён!");
      window.history.replaceState({}, "", "/");
    }
    if (params.get("google") === "error") {
      const err = params.get("google_error");
      setStatus(err === "access_denied"
        ? "Google Fit: доступ не разрешён. Если видите «приложение не проверено» — нажмите «Дополнительные настройки» → «Перейти в Спутник»."
        : `Google Fit: ошибка подключения (${err ?? "unknown"})`);
      window.history.replaceState({}, "", "/");
    }
  }, [fetchSyncStatus, fetchProfile]);

  const referralLink = useMemo(() =>
    profile ? `https://t.me/${BOT_USERNAME}?start=${profile.telegram_id}` : "", [profile]);

  const redeemedIds = useMemo(() => new Set(redeemed.map(r => r.id)), [redeemed]);

  const saveProfile = async () => {
    if (!profile) return;
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gender: profileForm.gender,
        height_cm: Number(profileForm.height_cm),
        weight_kg: Number(profileForm.weight_kg),
        birth_year: Number(profileForm.birth_year)
      })
    });
    setStatus(res.ok ? "Профиль сохранён" : "Ошибка сохранения");
    if (res.ok) fetchProfile();
  };

  const syncSteps = async () => {
    setStatus("Синхронизируем...");
    const res = await fetch("/api/steps/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period: syncPeriod })
    });
    if (res.status === 428) { setStatus("Сначала подключите Google Fit"); return; }
    if (res.ok) {
      const json = await res.json();
      setStatus(`Синхронизировано ${formatSteps(json.totalSteps)} шагов${json.totalBonus > 0 ? `, +${json.totalBonus} бонусов` : ""}`);
      fetchProfile(); fetchSyncStatus();
    } else setStatus(await res.text());
  };

  const redeemPromo = async (promoId: number) => {
    const res = await fetch("/api/promocodes/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promoCodeId: promoId })
    });
    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try { json = JSON.parse(text); } catch { /* plain text error */ }

    if (res.ok && json) {
      setBonusPoints(Number(json.newBalance ?? bonusPoints));
      setActivationBanner({
        title: String(json.title),
        code: String(json.code),
        detail: String(json.message)
      });
      setStatus(String(json.message));
      fetchProfile(); fetchRedeemed(); fetchPromos();
    } else {
      setStatus(String(json?.message ?? text));
    }
  };

  const profileFields = (
    <div className="grid gap-3 md:grid-cols-2">
      {[
        { key: "gender" as const, label: "Пол", type: "select" },
        { key: "height_cm" as const, label: "Рост, см", type: "number" },
        { key: "weight_kg" as const, label: "Вес, кг", type: "number" },
        { key: "birth_year" as const, label: "Год рождения", type: "number" }
      ].map(f => (
        <label key={f.key} className="block space-y-1 text-sm">
          {f.label}
          {f.type === "select" ? (
            <select value={profileForm.gender} onChange={e => setProfileForm(p => ({ ...p, gender: e.target.value }))} className="w-full rounded-2xl border px-3 py-2">
              <option value="">Выберите</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          ) : (
            <input type="number" value={profileForm[f.key]} onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full rounded-2xl border px-3 py-2" />
          )}
        </label>
      ))}
    </div>
  );

  const promoCard = (code: PromoCode) => {
    const isRedeemed = redeemedIds.has(code.id);
    const canAfford = bonusPoints >= code.cost_points;

    return (
      <div key={code.id} className={`rounded-3xl border p-4 ${isRedeemed ? "border-green-300 bg-green-50" : "border-slate-200 bg-white"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{code.title}</p>
            {code.partner_name && <p className="text-sm text-primary">Партнёр: {code.partner_name}</p>}
            <p className="text-sm text-slate-500">{code.description}</p>
            {code.user_cashback_percent > 0 && (
              <p className="mt-1 text-sm font-medium text-slate-700">
                Скидка: {code.user_cashback_percent}%
              </p>
            )}
          </div>
          {isRedeemed ? (
            <span className="rounded-full bg-green-200 px-3 py-1 text-xs font-medium text-green-900">✓ Активировано</span>
          ) : code.cost_points > 0 ? (
            <span className={`rounded-full px-3 py-1 text-sm ${canAfford ? "bg-slate-100" : "bg-red-100 text-red-800"}`}>
              {code.cost_points} бонусов
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">бесплатно</span>
          )}
        </div>
        {isRedeemed ? (
          <div className="mt-3 rounded-2xl bg-white p-3 font-mono text-sm">{code.code}</div>
        ) : (
          <button
            className="mt-4 w-full rounded-2xl bg-primary px-4 py-2 text-white disabled:opacity-50"
            disabled={!code.active || !canAfford}
            onClick={() => redeemPromo(code.id)}
          >
            {!canAfford && code.cost_points > 0
              ? `Нужно ещё ${code.cost_points - bonusPoints} бонусов`
              : code.cost_points > 0
                ? `Активировать за ${code.cost_points} бонусов`
                : "Получить бесплатно"}
          </button>
        )}
      </div>
    );
  };

  return (
    <main className="container max-w-lg py-4 pb-24">
      {/* Header */}
      <header className="mb-4 rounded-3xl border bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Спутник</h1>
        <p className="text-sm text-slate-600">{appConfig?.about.description ?? "Трекинг шагов и бонусы"}</p>
        {profile && (
          <p className="mt-2 text-lg">Баланс: <strong className="text-primary">{bonusPoints}</strong> бонусов</p>
        )}
        {appConfig && (
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            {appConfig.about.rules.map(r => <li key={r}>• {r}</li>)}
          </ul>
        )}
      </header>

      {activationBanner && (
        <div className="mb-4 rounded-3xl border-2 border-green-400 bg-green-50 p-5">
          <p className="font-semibold text-green-900">🎉 {activationBanner.title}</p>
          <p className="mt-2 font-mono text-lg">{activationBanner.code}</p>
          <p className="mt-2 text-sm text-green-800">{activationBanner.detail}</p>
          <button className="mt-3 text-sm underline" onClick={() => setActivationBanner(null)}>Закрыть</button>
        </div>
      )}

      {!isTelegram && (
        <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">Откройте через бота в Telegram</p>
      )}

      {/* Tab content */}
      {tab === "user" && (
        <div className="space-y-4">
          {!profile && (
            <button className="w-full rounded-2xl bg-slate-900 py-3 text-white" onClick={loginWithTelegram}>Войти через Telegram</button>
          )}

          {profile && !profileComplete && (
            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <h2 className="mb-3 font-semibold">Заполните профиль</h2>
              {profileFields}
              <button className="mt-4 w-full rounded-2xl bg-primary py-2 text-white" onClick={saveProfile}>Сохранить</button>
            </section>
          )}

          {profile && profileComplete && (
            <section className="rounded-3xl border bg-white p-5">
              <h2 className="mb-2 font-semibold">{profile.first_name} {profile.last_name ?? ""}</h2>
              {profile.username && <p className="text-sm text-slate-500">@{profile.username}</p>}
              <div className="mt-4">{profileFields}</div>
              <button className="mt-4 rounded-2xl bg-primary px-4 py-2 text-white" onClick={saveProfile}>Обновить</button>
            </section>
          )}

          {/* Metrics — only after Google Fit connected */}
          <section className="rounded-3xl border bg-white p-5">
            <h2 className="mb-3 font-semibold">Метрики шагов</h2>
            {!googleConnected ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="mb-3">Подключите Google Fit, чтобы видеть шаги и начислять бонусы автоматически.</p>
                {googleConfigured && (
                  <button className="w-full rounded-2xl bg-primary py-2 text-white" onClick={() => { window.location.href = "/api/google-fit/auth"; }}>
                    Подключить Google Fit
                  </button>
                )}
                <GoogleFitUserGuide />
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500">Сегодня</p>
                <p className="text-3xl font-bold text-primary">{formatSteps(stepsToday)} шагов</p>
                <p className="text-xs text-slate-400">Верифицировано (Google Fit): {formatSteps(verifiedSteps)}</p>
                {lastSync && <p className="mt-1 text-xs text-slate-400">Синхр.: {new Date(lastSync.at).toLocaleString("ru-RU")}</p>}
                <div className="mt-4 space-y-3">
                  <select value={syncPeriod} onChange={e => setSyncPeriod(e.target.value as typeof syncPeriod)} className="w-full rounded-2xl border px-3 py-2 text-sm">
                    <option value="today">Сегодня</option>
                    <option value="7d">7 дней</option>
                    <option value="30d">30 дней</option>
                  </select>
                  <button className="w-full rounded-2xl bg-slate-900 py-2 text-white" onClick={syncSteps}>Синхронизировать шаги</button>
                </div>
                <GoogleFitUserGuide />
              </>
            )}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-slate-500">Ручной ввод</summary>
              <div className="mt-2 flex gap-2">
                <input type="number" value={manualSteps} onChange={e => setManualSteps(e.target.value)} className="flex-1 rounded-2xl border px-3 py-2" placeholder="Шаги" />
                <button className="rounded-2xl border px-4" onClick={async () => {
                  const res = await fetch("/api/steps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "manual", stepCount: Number(manualSteps) || 0 }) });
                  if (res.ok) { setManualSteps(""); fetchProfile(); setStatus("Шаги сохранены"); }
                }}>OK</button>
              </div>
            </details>
          </section>

          <section className="rounded-3xl border bg-white p-5">
            <h2 className="mb-2 font-semibold">Реферальная ссылка</h2>
            <p className="mb-2 text-sm text-slate-600">+{appConfig?.referralBonus ?? 25} бонусов за друга</p>
            <div className="break-all rounded-2xl bg-slate-100 p-3 text-xs">{referralLink || "—"}</div>
            {referralLink && <button className="mt-2 text-sm text-primary underline" onClick={() => navigator.clipboard.writeText(referralLink)}>Копировать</button>}
          </section>

          {redeemed.length > 0 && (
            <section className="rounded-3xl border bg-white p-5">
              <h2 className="mb-3 font-semibold">Мои активированные коды</h2>
              <div className="space-y-2">
                {redeemed.map(r => (
                  <div key={r.id} className="rounded-2xl bg-green-50 p-3">
                    <p className="font-medium">{r.title}</p>
                    <p className="font-mono text-sm">{r.code}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "shop" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Обменивайте бонусы на промокоды и награды</p>
          {shopPromos.length === 0 ? <p className="text-slate-500">Пока пусто</p> : shopPromos.map(p => promoCard(p))}
        </div>
      )}

      {tab === "showcase" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Партнёрские акции и квесты — оплата бонусами, как в магазине</p>
          {showcasePromos.length === 0 ? <p className="text-slate-500">Скоро появятся акции</p> : showcasePromos.map(p => promoCard(p))}
        </div>
      )}

      {status && !activationBanner && (
        <p className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm text-slate-700">{status}</p>
      )}

      {/* Bottom tabs */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white px-2 py-2 shadow-lg">
        <div className="container flex max-w-lg justify-around">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-2xl py-2 text-sm font-medium ${tab === t.id ? "bg-primary text-white" : "text-slate-600"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
