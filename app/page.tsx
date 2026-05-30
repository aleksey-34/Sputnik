"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleFitUserGuide } from "@/components/GoogleFitUserGuide";
import { GoogleFitConnectButton, GoogleFitOpenAppButton } from "@/components/GoogleFitConnectButton";
import { PartnerVoucherCard } from "@/components/PartnerVoucherCard";
import { BrandLogo } from "@/components/BrandLogo";
import { copyText } from "@/lib/utils/clipboard";

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
  voucher_token?: string;
  voucher_url?: string;
  status?: string;
  used_at?: string;
  expires_at?: string;
  user_discount_percent?: number;
};

type VoucherBanner = {
  title: string;
  partnerName?: string;
  discountPercent: number;
  voucherUrl: string;
  status: string;
  expiresAt?: string;
  detail: string;
};

type ConfirmPromo = { promoCodeId: number; title: string; cost_points: number; user_discount_percent: number; partner_name?: string; message: string };

type AppConfig = {
  stepsPerBonus: number;
  referralBonus: number;
  about: { title: string; description: string; rules: string[] };
};

type ProfileForm = { gender: string; height_cm: string; weight_kg: string; birth_year: string };

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
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  const [lastSync, setLastSync] = useState<{ at: string; steps: number } | null>(null);
  const [status, setStatus] = useState("");
  const [voucherBanner, setVoucherBanner] = useState<VoucherBanner | null>(null);
  const [confirmPromo, setConfirmPromo] = useState<ConfirmPromo | null>(null);
  const [activationBanner, setActivationBanner] = useState<{ title: string; code: string; detail: string } | null>(null);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);
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
    if (tg?.initData) {
      const params = new URLSearchParams(tg.initData);
      const startParam = params.get("start_param") ?? tg.initDataUnsafe?.start_param;
      if (startParam === "partner") {
        window.location.replace("/partner");
        return;
      }
      setIsTelegram(true);
      tg.ready();
      tg.expand();
      tg.disableVerticalSwipes?.();
      loginWithTelegram();
    }
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
    profile ? `https://t.me/${BOT_USERNAME}?startapp=${profile.telegram_id}` : "", [profile]);

  const copyReferralLink = async () => {
    if (!referralLink) return;
    const ok = await copyText(referralLink);
    if (ok) {
      setStatus("Ссылка скопирована");
      window.Telegram?.WebApp?.showAlert?.("Ссылка скопирована");
    } else {
      setStatus("Не удалось скопировать — выделите ссылку вручную");
    }
  };

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
    const res = await fetch("/api/steps/sync", { method: "POST" });
    if (res.status === 428) { setStatus("Сначала подключите Google Fit"); return; }
    if (res.ok) {
      const json = await res.json();
      if (json.totalSteps === 0) {
        setStatus("Синхронизация прошла, но шагов в Google Fit пока нет. Установите Google Fit, пройдите 50–100 шагов и повторите.");
      } else {
        setStatus(`Синхронизировано ${formatSteps(json.totalSteps)} шагов${json.totalBonus > 0 ? `, +${json.totalBonus} бонусов` : ""}`);
      }
      fetchProfile(); fetchSyncStatus();
    } else setStatus(await res.text());
  };

  const redeemPromo = async (promoId: number, confirmed = false) => {
    setRedeemingId(promoId);
    const res = await fetch("/api/promocodes/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promoCodeId: promoId, confirmed })
    });
    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try { json = JSON.parse(text); } catch { /* plain text error */ }

    if (json?.needsConfirmation) {
      setConfirmPromo({
        promoCodeId: promoId,
        title: String(json.title),
        cost_points: Number(json.cost_points),
        user_discount_percent: Number(json.user_discount_percent),
        partner_name: json.partner_name ? String(json.partner_name) : undefined,
        message: String(json.message)
      });
      setRedeemingId(null);
      return;
    }

    if (res.ok && json) {
      setConfirmPromo(null);
      setBonusPoints(Number(json.newBalance ?? bonusPoints));

      if (json.voucher_url && json.kind !== "bonus_shop") {
        setVoucherBanner({
          title: String(json.title),
          partnerName: json.partner_name ? String(json.partner_name) : undefined,
          discountPercent: Number(json.user_discount_percent ?? 0),
          voucherUrl: String(json.voucher_url),
          status: String(json.status ?? "active"),
          expiresAt: json.expires_at ? String(json.expires_at) : undefined,
          detail: String(json.message)
        });
        setActivationBanner(null);
      } else if (json.alreadyRedeemed && json.voucher_url) {
        setVoucherBanner({
          title: String(json.title),
          partnerName: json.partner_name ? String(json.partner_name) : undefined,
          discountPercent: Number(json.user_discount_percent ?? 0),
          voucherUrl: String(json.voucher_url),
          status: String(json.status ?? "active"),
          detail: String(json.message)
        });
      } else {
        setActivationBanner({
          title: String(json.title),
          code: String(json.code ?? ""),
          detail: String(json.message)
        });
      }

      setStatus(String(json.message));
      fetchProfile(); fetchRedeemed(); fetchPromos();
    } else {
      setStatus(String(json?.message ?? text));
    }
    setRedeemingId(null);
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
      <div key={code.id} className={`card-brand p-4 ${isRedeemed ? "border-accent/40 bg-accent-light/30" : ""}`}>
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
          code.voucher_url && code.status !== "used" ? (
            <button className="mt-4 w-full rounded-2xl border border-primary py-2 text-sm text-primary" onClick={() => setVoucherBanner({
              title: code.title,
              partnerName: code.partner_name,
              discountPercent: code.user_discount_percent ?? code.user_cashback_percent,
              voucherUrl: code.voucher_url!,
              status: code.status ?? "active",
              expiresAt: code.expires_at,
              detail: "Покажите QR сотруднику"
            })}>
              {code.status === "used" ? "Использовано" : "Показать QR"}
            </button>
          ) : (
            <div className="mt-3 rounded-2xl bg-white p-3 font-mono text-sm">{code.code}</div>
          )
        ) : (
          <button
            type="button"
            className="mt-4 w-full btn-accent disabled:opacity-50"
            disabled={!code.active || !canAfford || redeemingId === code.id}
            onClick={() => redeemPromo(code.id)}
          >
            {redeemingId === code.id
              ? "Активация…"
              : !canAfford && code.cost_points > 0
                ? `Нужно ещё ${code.cost_points - bonusPoints} бонусов`
                : code.kind === "partner" || code.kind === "quest"
                  ? `Активировать за ${code.cost_points} бонусов`
                  : code.cost_points > 0
                    ? `Активировать за ${code.cost_points} бонусов`
                    : "Получить бесплатно"}
          </button>
        )}
      </div>
    );
  };

  return (
    <main className="container max-w-lg py-4 pb-[calc(var(--app-nav-height)+env(safe-area-inset-bottom,0px)+3rem)]">
      <header className="card-brand mb-4 p-5">
        <BrandLogo size="sm" className="mb-3" />
        {profile && (
          <p className="text-center text-lg text-primary">
            Баланс: <strong className="text-accent-dark">{bonusPoints}</strong> бонусов
          </p>
        )}
        {appConfig && (
          <ul className="mt-3 space-y-1 text-xs text-brand-muted">
            {appConfig.about.rules.map(r => <li key={r}>• {r}</li>)}
          </ul>
        )}
      </header>

      {confirmPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-xl">
            <p className="font-semibold">{confirmPromo.title}</p>
            <p className="mt-2 text-sm">{confirmPromo.message}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 btn-accent disabled:opacity-60"
                disabled={redeemingId !== null}
                onClick={() => redeemPromo(confirmPromo.promoCodeId, true)}
              >
                {redeemingId !== null ? "Списываем бонусы…" : `Подтвердить (−${confirmPromo.cost_points} бон.)`}
              </button>
              <button type="button" className="rounded-2xl border px-4 py-2" onClick={() => setConfirmPromo(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {voucherBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto">
            <PartnerVoucherCard
              title={voucherBanner.title}
              partnerName={voucherBanner.partnerName}
              discountPercent={voucherBanner.discountPercent}
              voucherUrl={voucherBanner.voucherUrl}
              status={voucherBanner.status}
              expiresAt={voucherBanner.expiresAt}
              onClose={() => setVoucherBanner(null)}
            />
            <p className="mt-2 rounded-2xl bg-white p-3 text-sm text-slate-700">{voucherBanner.detail}</p>
          </div>
        </div>
      )}

      {activationBanner && !voucherBanner && (
        <div className="mb-4 rounded-3xl border-2 border-accent/50 bg-accent-light p-5">
          <p className="font-semibold text-green-900">🎉 {activationBanner.title}</p>
          <p className="mt-2 font-mono text-lg">{activationBanner.code}</p>
          <p className="mt-2 text-sm text-green-800">{activationBanner.detail}</p>
          <button className="mt-3 text-sm underline" onClick={() => setActivationBanner(null)}>Закрыть</button>
        </div>
      )}

      {!isTelegram && (
        <p className="mb-4 rounded-2xl bg-accent-light p-3 text-sm text-primary">Откройте через бота в Telegram</p>
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
              <button className="mt-4 w-full btn-accent" onClick={saveProfile}>Сохранить</button>
            </section>
          )}

          {profile && profileComplete && (
            <section className="card-brand p-5">
              <h2 className="mb-2 font-semibold text-primary">{profile.first_name} {profile.last_name ?? ""}</h2>
              {profile.username && <p className="text-sm text-slate-500">@{profile.username}</p>}
              <div className="mt-4">{profileFields}</div>
              <button className="mt-4 btn-primary" onClick={saveProfile}>Обновить</button>
            </section>
          )}

          <section className="card-brand p-5">
            <h2 className="mb-3 font-semibold text-primary">Метрики шагов</h2>
            {!googleConnected ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="mb-3">Подключите Google Fit, чтобы видеть шаги и начислять бонусы автоматически.</p>
                {googleConfigured && (
                  <GoogleFitConnectButton onConnectOAuth={() => { window.location.href = "/api/google-fit/auth"; }} />
                )}
                <GoogleFitOpenAppButton className="mt-2 w-full rounded-2xl border border-primary py-2 text-sm text-primary" />
                <GoogleFitUserGuide />
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500">Сегодня</p>
                <p className="text-3xl font-bold text-accent-dark">{formatSteps(stepsToday)} шагов</p>
                <p className="text-xs text-slate-400">Верифицировано (Google Fit): {formatSteps(verifiedSteps)}</p>
                {lastSync && <p className="mt-1 text-xs text-slate-400">Синхр.: {new Date(lastSync.at).toLocaleString("ru-RU")}</p>}
                <p className="mt-2 text-xs text-slate-500">Считаются только шаги за сегодня, с даты регистрации в приложении.</p>
                <button className="mt-4 w-full btn-primary py-2" onClick={syncSteps}>Синхронизировать шаги</button>
                <GoogleFitOpenAppButton />
                <GoogleFitUserGuide />
              </>
            )}
          </section>

          <section className="card-brand p-5">
            <h2 className="mb-2 font-semibold text-primary">Реферальная ссылка</h2>
            <p className="mb-2 text-sm text-slate-600">+{appConfig?.referralBonus ?? 10} бонусов за друга</p>
            <p className="mb-2 text-xs text-slate-400">Друг должен открыть ссылку — так приложение получит реферальный код</p>
            <div className="break-all rounded-2xl bg-slate-100 p-3 text-xs">{referralLink || "—"}</div>
            {referralLink && <button type="button" className="mt-2 text-sm text-accent-dark underline" onClick={copyReferralLink}>Копировать</button>}
          </section>

          {redeemed.length > 0 && (
            <section className="card-brand p-5">
              <h2 className="mb-3 font-semibold text-primary">Мои акции и коды</h2>
              <div className="space-y-2">
                {redeemed.map(r => (
                  <div key={r.id} className="rounded-2xl bg-green-50 p-3">
                    <p className="font-medium">{r.title}</p>
                    {r.voucher_url ? (
                      <>
                        <p className="text-sm text-slate-600">
                          {r.status === "used" ? "✓ Использовано у партнёра" : `Скидка ${r.user_discount_percent}% · покажите QR`}
                        </p>
                        {r.status !== "used" && (
                          <button className="mt-2 text-sm text-primary underline" onClick={() => setVoucherBanner({
                            title: r.title,
                            partnerName: r.partner_name,
                            discountPercent: r.user_discount_percent ?? r.user_cashback_percent,
                            voucherUrl: r.voucher_url!,
                            status: r.status ?? "active",
                            expiresAt: r.expires_at,
                            detail: ""
                          })}>
                            Открыть QR
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="font-mono text-sm">{r.code}</p>
                    )}
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
          <div className="h-8" aria-hidden />
        </div>
      )}

      {tab === "showcase" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Партнёрские акции и квесты — оплата бонусами, как в магазине</p>
          {showcasePromos.length === 0 ? <p className="text-slate-500">Скоро появятся акции</p> : showcasePromos.map(p => promoCard(p))}
          <div className="h-8" aria-hidden />
        </div>
      )}

      {status && !activationBanner && (
        <p className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm text-slate-700">{status}</p>
      )}

      {/* Bottom tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-primary/10 bg-white px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-brand">
        <div className="container flex max-w-lg justify-around">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-2xl py-2.5 text-sm font-medium transition ${tab === t.id ? "bg-primary text-white shadow-brand" : "text-brand-muted"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
