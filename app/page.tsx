"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type UserProfile = {
  id: number;
  telegram_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
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
  cost_points: number;
  reward_points: number;
  active: boolean;
};

type ProfileForm = {
  gender: string;
  height_cm: number;
  weight_kg: number;
  birth_year: number;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: Record<string, unknown>;
        ready: () => void;
        expand: () => void;
        close: () => void;
      };
    };
  }
}

const formatSteps = (count: number) => new Intl.NumberFormat("ru-RU").format(count);
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "sputnik_bot";

export default function HomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [profileComplete, setProfileComplete] = useState(false);
  const [stepsToday, setStepsToday] = useState(0);
  const [manualSteps, setManualSteps] = useState(0);
  const [status, setStatus] = useState("");
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    gender: "",
    height_cm: 170,
    weight_kg: 70,
    birth_year: 1995
  });
  const [isTelegram, setIsTelegram] = useState(false);

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (res.ok) {
      const json = await res.json();
      setProfile(json.profile ?? null);
      setBonusPoints(json.points ?? 0);
      setStepsToday(json.stepsToday ?? 0);
      setProfileComplete(Boolean(json.profileComplete));
      if (json.profile) {
        setProfileForm(prev => ({
          ...prev,
          gender: json.profile.gender ?? prev.gender,
          height_cm: json.profile.height_cm ?? prev.height_cm,
          weight_kg: json.profile.weight_kg ?? prev.weight_kg,
          birth_year: json.profile.birth_year ?? prev.birth_year
        }));
      }
    }
  }, []);

  const fetchPromoCodes = useCallback(async () => {
    const res = await fetch("/api/promocodes");
    if (res.ok) {
      setPromoCodes(await res.json());
    }
  }, []);

  const loginWithTelegram = useCallback(async () => {
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData;

    if (!initData) {
      setStatus("Откройте мини-приложение внутри Telegram.");
      return;
    }

    setStatus("Выполняется вход...");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData })
    });

    if (res.ok) {
      await fetchProfile();
      setStatus("Успешно вошли через Telegram");
    } else {
      const error = await res.text();
      setStatus(`Ошибка входа: ${error}`);
    }
  }, [fetchProfile]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initData) {
      setIsTelegram(true);
      tg.ready();
      tg.expand();
      loginWithTelegram();
    }
    fetchPromoCodes();
  }, [fetchPromoCodes, loginWithTelegram]);

  const referralLink = useMemo(() => {
    if (!profile) return "";
    return `https://t.me/${BOT_USERNAME}?start=${profile.telegram_id}`;
  }, [profile]);

  const saveProfile = async () => {
    if (!profile) return;
    setStatus("Сохраняем профиль...");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm)
    });
    if (res.ok) {
      setStatus("Профиль сохранён");
      fetchProfile();
    } else {
      setStatus("Не удалось сохранить профиль");
    }
  };

  const sendManualSteps = async () => {
    setStatus("Сохраняем шаги...");
    const res = await fetch("/api/steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "manual", stepCount: manualSteps })
    });
    if (res.ok) {
      const json = await res.json();
      setStatus(json.newPoints > 0 ? `Шаги сохранены! +${json.newPoints} бонусов` : "Шаги сохранены");
      setManualSteps(0);
      fetchProfile();
    } else {
      setStatus("Не удалось записать шаги");
    }
  };

  const connectGoogleFit = () => {
    window.location.href = "/api/google-fit/auth";
  };

  const redeemPromo = async (codeId: number) => {
    const res = await fetch("/api/promocodes/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promoCodeId: codeId })
    });
    if (res.ok) {
      setStatus("Промокод активирован");
      fetchProfile();
      fetchPromoCodes();
    } else {
      const detail = await res.text();
      setStatus(`Ошибка: ${detail}`);
    }
  };

  const copyReferral = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setStatus("Реферальная ссылка скопирована");
  };

  return (
    <main className="container py-8">
      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-3xl font-semibold">Спутник</h1>
          <p className="text-slate-600">Трекинг шагов, бонусы и промокоды в Telegram Mini App.</p>
          {profile && (
            <p className="mt-3 text-lg">
              Баланс: <strong className="text-primary">{bonusPoints}</strong> бонусов
            </p>
          )}
        </section>

        {!isTelegram && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            Для полной работы откройте приложение через бота в Telegram.
          </section>
        )}

        {profile && !profileComplete && (
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-2 text-xl font-semibold">Заполните профиль</h2>
            <p className="mb-4 text-slate-600">При первом входе укажите рост, вес, пол и год рождения.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-1 text-sm text-slate-700">
                Пол
                <select
                  value={profileForm.gender}
                  onChange={e => setProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full rounded-2xl border px-3 py-2"
                >
                  <option value="">Выберите</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm text-slate-700">
                Рост, см
                <input
                  type="number"
                  value={profileForm.height_cm}
                  onChange={e => setProfileForm(prev => ({ ...prev, height_cm: Number(e.target.value) }))}
                  className="w-full rounded-2xl border px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm text-slate-700">
                Вес, кг
                <input
                  type="number"
                  value={profileForm.weight_kg}
                  onChange={e => setProfileForm(prev => ({ ...prev, weight_kg: Number(e.target.value) }))}
                  className="w-full rounded-2xl border px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm text-slate-700">
                Год рождения
                <input
                  type="number"
                  value={profileForm.birth_year}
                  onChange={e => setProfileForm(prev => ({ ...prev, birth_year: Number(e.target.value) }))}
                  className="w-full rounded-2xl border px-3 py-2"
                />
              </label>
            </div>
            <button className="mt-4 rounded-2xl bg-primary px-4 py-2 text-white" onClick={saveProfile}>
              Сохранить профиль
            </button>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Профиль</h2>
                <p className="text-slate-500">Telegram и персональные данные.</p>
              </div>
              {!profile && (
                <button className="rounded-full bg-slate-900 px-4 py-2 text-white" onClick={loginWithTelegram}>
                  Войти через Telegram
                </button>
              )}
            </div>

            {profile ? (
              <div className="space-y-3">
                <p className="text-slate-800">
                  Пользователь: <strong>{profile.first_name} {profile.last_name ?? ""}</strong>
                  {profile.username && <span className="text-slate-500"> @{profile.username}</span>}
                </p>
                {profileComplete && (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block space-y-1 text-sm text-slate-700">
                        Пол
                        <select
                          value={profileForm.gender}
                          onChange={e => setProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                          className="w-full rounded-2xl border px-3 py-2"
                        >
                          <option value="male">Мужской</option>
                          <option value="female">Женский</option>
                        </select>
                      </label>
                      <label className="block space-y-1 text-sm text-slate-700">
                        Рост, см
                        <input
                          type="number"
                          value={profileForm.height_cm}
                          onChange={e => setProfileForm(prev => ({ ...prev, height_cm: Number(e.target.value) }))}
                          className="w-full rounded-2xl border px-3 py-2"
                        />
                      </label>
                      <label className="block space-y-1 text-sm text-slate-700">
                        Вес, кг
                        <input
                          type="number"
                          value={profileForm.weight_kg}
                          onChange={e => setProfileForm(prev => ({ ...prev, weight_kg: Number(e.target.value) }))}
                          className="w-full rounded-2xl border px-3 py-2"
                        />
                      </label>
                      <label className="block space-y-1 text-sm text-slate-700">
                        Год рождения
                        <input
                          type="number"
                          value={profileForm.birth_year}
                          onChange={e => setProfileForm(prev => ({ ...prev, birth_year: Number(e.target.value) }))}
                          className="w-full rounded-2xl border px-3 py-2"
                        />
                      </label>
                    </div>
                    <button className="rounded-2xl bg-primary px-4 py-2 text-white" onClick={saveProfile}>
                      Обновить профиль
                    </button>
                  </>
                )}
              </div>
            ) : (
              <p className="text-slate-600">Откройте приложение в Telegram для автоматического входа.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Реферальная ссылка</h2>
            <p className="mb-3 text-slate-600">Пригласите друзей — получите 25 бонусов за каждого нового пользователя.</p>
            <div className="mb-3 break-all rounded-3xl bg-slate-100 p-4 text-sm text-slate-800">
              {referralLink || "Сначала авторизуйтесь"}
            </div>
            {referralLink && (
              <button className="rounded-2xl bg-slate-900 px-4 py-2 text-white" onClick={copyReferral}>
                Копировать ссылку
              </button>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Трекер шагов</h2>
            <p className="text-slate-600">Сегодня вы прошли:</p>
            <p className="mb-4 text-4xl font-semibold text-primary">{formatSteps(stepsToday)} шагов</p>
            <p className="mb-4 text-sm text-slate-500">1 бонус за каждые 1000 шагов</p>
            <button className="mr-3 rounded-2xl bg-primary px-4 py-2 text-white" onClick={connectGoogleFit}>
              Подключить Google Fit
            </button>
            <div className="mt-6 space-y-3">
              <label className="block space-y-1 text-sm text-slate-700">
                Ввести шаги вручную
                <input
                  type="number"
                  min={0}
                  value={manualSteps}
                  onChange={e => setManualSteps(Number(e.target.value))}
                  className="w-full rounded-2xl border px-3 py-2"
                />
              </label>
              <button className="rounded-2xl bg-slate-900 px-4 py-2 text-white" onClick={sendManualSteps}>
                Отправить
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Магазин бонусов</h2>
            {promoCodes.length === 0 ? (
              <p className="text-slate-600">Нет доступных промокодов.</p>
            ) : (
              <div className="space-y-4">
                {promoCodes.map(code => (
                  <div key={code.id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{code.title}</p>
                        <p className="text-sm text-slate-500">{code.description}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                        {code.cost_points} бонусов
                      </span>
                    </div>
                    <button
                      className="mt-4 w-full rounded-2xl bg-primary px-4 py-2 text-white disabled:opacity-50"
                      disabled={!code.active || bonusPoints < code.cost_points}
                      onClick={() => redeemPromo(code.id)}
                    >
                      Активировать
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {status && (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-slate-600">{status}</p>
          </section>
        )}
      </div>
    </main>
  );
}
