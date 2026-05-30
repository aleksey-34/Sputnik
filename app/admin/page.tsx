"use client";

import { useCallback, useEffect, useState } from "react";

type Stats = { users: number; syncs: number; totalBonuses: number; totalSteps: number };
type UserRow = {
  id: number;
  telegram_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  gender?: string;
  birth_year?: number;
  bonusPoints: number;
  totalSteps: number;
  verifiedSteps: number;
  redemptionsCount: number;
  googleFitConnected: boolean;
  created_at: string;
};
type UserDetail = UserRow & {
  height_cm?: number;
  weight_kg?: number;
  googleFitConnected: boolean;
  syncCount: number;
  lastSyncAt?: string;
  redemptions: {
    id: number; redeemed_at: string; used_at?: string; status: string;
    voucher_token?: string; cost_points: number; user_discount_percent: number;
    code: string; title: string; kind: string; partner_name?: string;
    bill_amount_rub?: number; discount_amount_rub?: number; client_pays_rub?: number;
    platform_fee_amount_rub?: number;
  }[];
  transactions: { id: number; points: number; type: string; source?: string; created_at: string; meta?: unknown }[];
  referralsSent: { id: number; first_name: string; username?: string; created_at: string }[];
  referredBy?: { id: number; first_name: string; username?: string } | null;
  recentSteps: { date: string; source: string; step_count: number }[];
};
type Promo = {
  id: number;
  code: string;
  title: string;
  description?: string;
  kind: string;
  partner_name?: string;
  partner_pin?: string;
  cost_points: number;
  reward_points: number;
  discount_percent: number;
  user_cashback_percent: number;
  platform_fee_percent: number;
  active: boolean;
  redemptions_count?: number;
};
type PromoForm = Omit<Promo, "id" | "active" | "redemptions_count"> & { active?: boolean };
type SyncLog = {
  id: number;
  created_at: string;
  first_name?: string;
  username?: string;
  source: string;
  period: string;
  steps_synced: number;
  bonus_awarded: number;
  status: string;
};

type Tab = "dashboard" | "users" | "promos" | "settlements" | "logs" | "settings";

const EMPTY_PROMO: PromoForm = {
  code: "", title: "", description: "", kind: "partner",
  partner_name: "", partner_pin: "", cost_points: 20, reward_points: 0,
  discount_percent: 15, user_cashback_percent: 10, platform_fee_percent: 5
};

const KIND_LABELS: Record<string, string> = {
  bonus_shop: "Магазин бонусов",
  partner: "Партнёрская акция",
  quest: "Квест"
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      {children}
    </label>
  );
}

function inputCls() {
  return "w-full rounded-2xl border px-3 py-2 text-sm";
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [settlements, setSettlements] = useState<Array<{
    id: number; partner_name: string; user_name: string; user_discount_percent: number;
    platform_fee_percent: number; total_margin_percent: number; cost_points: number;
    bill_amount_rub: number; discount_amount_rub: number; platform_fee_amount_rub: number;
    client_pays_rub: number; status: string; confirmed_at: string;
  }>>([]);
  const [financeSummary, setFinanceSummary] = useState<{
    totalActivations: number; activeVouchers: number; usedVouchers: number;
    totalBillRub: number; totalDiscountRub: number; totalPlatformFeeRub: number;
    totalClientPaysRub: number; totalBonusesSpent: number;
  } | null>(null);
  const [allRedemptions, setAllRedemptions] = useState<Array<{
    id: number; redeemed_at: string; used_at?: string; status: string;
    user_name: string; username?: string; promo_code: string; promo_title: string;
    cost_points: number; bill_amount_rub?: number; discount_amount_rub?: number;
    client_pays_rub?: number; platform_fee_amount_rub?: number;
  }>>([]);
  const [partnerEvents, setPartnerEvents] = useState<Array<{
    id: number; event: string; status: string; partner_name?: string; created_at: string;
  }>>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [newPromo, setNewPromo] = useState<PromoForm>(EMPTY_PROMO);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [editForm, setEditForm] = useState<PromoForm & { id: number; active: boolean } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [bonusEdit, setBonusEdit] = useState("");
  const [bonusReason, setBonusReason] = useState("");

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/admin/auth");
    if (res.ok) {
      const json = await res.json();
      setAuthenticated(Boolean(json.authenticated));
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async () => {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: adminKey })
    });
    if (res.ok) {
      setAuthenticated(true);
      setStatus("Вход выполнен");
      loadTab("dashboard");
    } else {
      setStatus("Неверный ключ");
    }
  };

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
  };

  const loadUserDetail = async (id: number) => {
    setSelectedUserId(id);
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) {
      const detail = await res.json();
      setUserDetail(detail);
      setBonusEdit(String(detail.bonusPoints));
    }
  };

  const loadTab = async (t: Tab) => {
    setTab(t);
    if (t !== "users") {
      setSelectedUserId(null);
      setUserDetail(null);
    }
    if (t === "dashboard") {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const json = await res.json();
        setStats(json.stats);
        setLogs(json.recentSyncs ?? []);
      }
    }
    if (t === "users") {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
    }
    if (t === "promos") {
      const res = await fetch("/api/admin/promocodes");
      if (res.ok) setPromos(await res.json());
    }
    if (t === "settlements") {
      const [finRes, setRes] = await Promise.all([
        fetch("/api/admin/redemptions"),
        fetch("/api/admin/settlements")
      ]);
      if (finRes.ok) {
        const json = await finRes.json();
        setFinanceSummary(json.summary);
        setAllRedemptions(json.redemptions ?? []);
        setPartnerEvents(json.recentEvents ?? []);
      }
      if (setRes.ok) setSettlements(await setRes.json());
    }
    if (t === "logs") {
      const res = await fetch("/api/admin/sync-logs");
      if (res.ok) setLogs(await res.json());
    }
    if (t === "settings") {
      const res = await fetch("/api/admin/settings");
      if (res.ok) setSettings(await res.json());
    }
  };

  useEffect(() => {
    if (authenticated) loadTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const savePromo = async (data: PromoForm & { id?: number; active?: boolean }, isEdit: boolean) => {
    const res = await fetch("/api/admin/promocodes", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { ...data, id: data.id } : data)
    });
    if (res.ok) {
      setStatus(isEdit ? "Акция обновлена" : "Акция создана");
      setEditingPromo(null);
      setEditForm(null);
      if (!isEdit) setNewPromo(EMPTY_PROMO);
      loadTab("promos");
    } else {
      setStatus(await res.text());
    }
  };

  const deletePromo = async (p: Promo) => {
    if (!confirm(`Удалить «${p.title}»? Если есть активации — будет деактивирована.`)) return;
    const res = await fetch(`/api/admin/promocodes?id=${p.id}`, { method: "DELETE" });
    const json = await res.json();
    setStatus(json.message ?? (json.deleted ? "Удалено" : "Деактивировано"));
    loadTab("promos");
  };

  const startEditPromo = (p: Promo) => {
    setEditingPromo(p);
    setEditForm({ ...p });
  };

  const saveSettings = async () => {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    setStatus(res.ok ? "Настройки сохранены" : "Ошибка сохранения");
  };

  const saveUserBonus = async () => {
    if (!selectedUserId) return;
    const res = await fetch(`/api/admin/users/${selectedUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setBalance: Number(bonusEdit), reason: bonusReason || "Корректировка администратором" })
    });
    if (res.ok) {
      setStatus("Баланс обновлён");
      loadUserDetail(selectedUserId);
      loadTab("users");
    }
  };

  const deleteUser = async () => {
    if (!selectedUserId || !userDetail) return;
    if (!confirm(`Удалить пользователя ${userDetail.first_name}? Все данные будут удалены.`)) return;
    const res = await fetch(`/api/admin/users/${selectedUserId}`, { method: "DELETE" });
    if (res.ok) {
      setStatus("Пользователь удалён");
      setSelectedUserId(null);
      setUserDetail(null);
      loadTab("users");
    }
  };

  const PromoFields = ({ form, setForm, showPartner }: {
    form: PromoForm;
    setForm: (fn: (p: PromoForm) => PromoForm) => void;
    showPartner?: boolean;
  }) => (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Тип акции" hint="Магазин — обмен бонусов. Партнёр — скидка у партнёра. Квест — особое задание.">
        <select value={form.kind} onChange={e => setForm(p => ({ ...p, kind: e.target.value }))} className={inputCls()}>
          <option value="bonus_shop">Магазин бонусов</option>
          <option value="partner">Партнёрская акция</option>
          <option value="quest">Квест</option>
        </select>
      </Field>
      <Field label="Партнёр" hint="Название салона, магазина и т.д. (для партнёрских акций)">
        <input value={form.partner_name ?? ""} onChange={e => setForm(p => ({ ...p, partner_name: e.target.value }))} className={inputCls()} />
      </Field>
      <Field label="PIN партнёра" hint="Для страницы /partner — сотрудник вводит PIN и сканирует QR клиента">
        <input value={form.partner_pin ?? ""} onChange={e => setForm(p => ({ ...p, partner_pin: e.target.value }))} className={inputCls()} />
      </Field>
      <Field label="Код для партнёра / юзера" hint="Внутренний код акции (не QR)">
        <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className={inputCls()} />
      </Field>
      <Field label="Название">
        <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls()} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Описание" hint="Текст на карточке акции в приложении">
          <input value={form.description ?? ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputCls()} />
        </Field>
      </div>
      <Field label="Цена в бонусах" hint="Сколько бонусов спишется при активации. 20 бонусов ≈ 20 000 шагов">
        <input type="number" min={0} value={form.cost_points} onChange={e => setForm(p => ({ ...p, cost_points: Number(e.target.value) }))} className={inputCls()} />
      </Field>
      <Field label="Награда в бонусах" hint="Сколько бонусов начислится (для WELCOME50 и обменов в магазине). 0 — без награды">
        <input type="number" min={0} value={form.reward_points} onChange={e => setForm(p => ({ ...p, reward_points: Number(e.target.value) }))} className={inputCls()} />
      </Field>
      {(showPartner || form.kind === "partner") && (
        <>
          <Field label="Маржа партнёра, %" hint="Общий процент, который партнёр готов отдать (скидка + платформа)">
            <input type="number" min={0} value={form.discount_percent} onChange={e => setForm(p => ({ ...p, discount_percent: Number(e.target.value) }))} className={inputCls()} />
          </Field>
          <Field label="Скидка клиенту, %" hint="Что получает пользователь при оплате у партнёра">
            <input type="number" min={0} value={form.user_cashback_percent} onChange={e => setForm(p => ({ ...p, user_cashback_percent: Number(e.target.value) }))} className={inputCls()} />
          </Field>
          <Field label="Доля платформы, %" hint="Комиссия Sputnik. Должна в сумме с скидкой = марже">
            <input type="number" min={0} value={form.platform_fee_percent} onChange={e => setForm(p => ({ ...p, platform_fee_percent: Number(e.target.value) }))} className={inputCls()} />
          </Field>
        </>
      )}
    </div>
  );

  if (!authenticated) {
    return (
      <main className="container py-12">
        <div className="mx-auto max-w-md rounded-3xl border bg-white p-8 shadow-sm">
          <h1 className="mb-4 text-2xl font-semibold">Sputnik Admin</h1>
          <input
            type="password"
            placeholder="Admin API Key"
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            className="mb-4 w-full rounded-2xl border px-4 py-3"
          />
          <button className="w-full rounded-2xl bg-primary px-4 py-3 text-white" onClick={login}>
            Войти
          </button>
          {status && <p className="mt-4 text-sm text-slate-600">{status}</p>}
        </div>
      </main>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Дашборд" },
    { id: "users", label: "Клиенты" },
    { id: "promos", label: "Акции" },
    { id: "settlements", label: "Партнёры" },
    { id: "logs", label: "Синхронизации" },
    { id: "settings", label: "Настройки" }
  ];

  return (
    <main className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sputnik Admin</h1>
        <button className="rounded-2xl border px-4 py-2 text-sm" onClick={logout}>Выйти</button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`rounded-full px-4 py-2 text-sm ${tab === t.id ? "bg-primary text-white" : "bg-slate-100"}`}
            onClick={() => loadTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && stats && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {[
              ["Пользователи", stats.users],
              ["Синхронизаций", stats.syncs],
              ["Всего бонусов", stats.totalBonuses],
              ["Всего шагов", stats.totalSteps]
            ].map(([label, val]) => (
              <div key={String(label)} className="rounded-3xl border bg-white p-6">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-3xl font-semibold">{Number(val).toLocaleString("ru-RU")}</p>
              </div>
            ))}
          </div>
          {logs.length > 0 && (
            <div className="overflow-x-auto rounded-3xl border bg-white">
              <h2 className="border-b p-4 font-semibold">Последние синхронизации</h2>
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="p-3">Время</th>
                    <th className="p-3">Период</th>
                    <th className="p-3">Шаги</th>
                    <th className="p-3">Бонусы</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 10).map(l => (
                    <tr key={l.id} className="border-b">
                      <td className="p-3">{new Date(l.created_at).toLocaleString("ru-RU")}</td>
                      <td className="p-3">{l.period}</td>
                      <td className="p-3">{l.steps_synced.toLocaleString("ru-RU")}</td>
                      <td className="p-3">+{l.bonus_awarded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "users" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className={`${selectedUserId ? "lg:col-span-2" : "lg:col-span-5"} overflow-x-auto rounded-3xl border bg-white`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="p-3">Имя</th>
                  <th className="p-3">Telegram</th>
                  <th className="p-3">Регистрация</th>
                  <th className="p-3">Шаги</th>
                  <th className="p-3">Бонусы</th>
                  <th className="p-3">Акции</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr
                    key={u.id}
                    className={`cursor-pointer border-b hover:bg-slate-50 ${selectedUserId === u.id ? "bg-blue-50" : ""}`}
                    onClick={() => loadUserDetail(u.id)}
                  >
                    <td className="p-3 font-medium">{u.first_name}{u.googleFitConnected ? " 📱" : ""}</td>
                    <td className="p-3">@{u.username ?? u.telegram_id}</td>
                    <td className="p-3 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString("ru-RU")}</td>
                    <td className="p-3">{u.totalSteps.toLocaleString("ru-RU")}</td>
                    <td className="p-3">{u.bonusPoints}</td>
                    <td className="p-3">{u.redemptionsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {userDetail && (
            <div className="space-y-4 lg:col-span-3">
              <div className="rounded-3xl border bg-white p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{userDetail.first_name} {userDetail.last_name ?? ""}</h2>
                    <p className="text-sm text-slate-500">@{userDetail.username ?? userDetail.telegram_id} · ID {userDetail.id}</p>
                    <p className="text-xs text-slate-400">Регистрация: {new Date(userDetail.created_at).toLocaleString("ru-RU")}</p>
                  </div>
                  <button className="rounded-2xl border border-red-200 px-3 py-1 text-sm text-red-600" onClick={deleteUser}>
                    Удалить
                  </button>
                </div>

                <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Баланс", `${userDetail.bonusPoints} бон.`],
                    ["Всего шагов", userDetail.totalSteps.toLocaleString("ru-RU")],
                    ["Google Fit", userDetail.verifiedSteps.toLocaleString("ru-RU")],
                    ["Синхронизаций", String(userDetail.syncCount)]
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">{k}</p>
                      <p className="font-semibold">{v}</p>
                    </div>
                  ))}
                </div>

                {(userDetail.gender || userDetail.birth_year || userDetail.height_cm) && (
                  <p className="mb-4 text-sm text-slate-600">
                    Профиль: {userDetail.gender ?? "—"}, {userDetail.birth_year ?? "—"} г.р., {userDetail.height_cm ?? "—"} см, {userDetail.weight_kg ?? "—"} кг
                  </p>
                )}

                {userDetail.referredBy && (
                  <p className="mb-2 text-sm">Приглашён: {userDetail.referredBy.first_name}</p>
                )}
                {userDetail.referralsSent.length > 0 && (
                  <p className="mb-4 text-sm">Пригласил: {userDetail.referralsSent.map(r => r.first_name).join(", ")}</p>
                )}

                <div className="mb-4 rounded-2xl border p-4">
                  <h3 className="mb-2 font-medium">Корректировка баланса</h3>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="number"
                      value={bonusEdit}
                      onChange={e => setBonusEdit(e.target.value)}
                      className="rounded-2xl border px-3 py-2 text-sm"
                      placeholder="Новый баланс"
                    />
                    <input
                      value={bonusReason}
                      onChange={e => setBonusReason(e.target.value)}
                      className="min-w-[160px] flex-1 rounded-2xl border px-3 py-2 text-sm"
                      placeholder="Причина (необязательно)"
                    />
                    <button className="rounded-2xl bg-primary px-4 py-2 text-sm text-white" onClick={saveUserBonus}>
                      Сохранить
                    </button>
                  </div>
                </div>

                <h3 className="mb-2 font-medium">Активированные акции</h3>
                {userDetail.redemptions.length === 0 ? (
                  <p className="mb-4 text-sm text-slate-400">Нет активаций</p>
                ) : (
                  <div className="mb-4 space-y-2">
                    {userDetail.redemptions.map(r => (
                      <div key={r.id} className="rounded-2xl border bg-slate-50 p-3 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{r.title} <span className="text-slate-400">({r.code})</span></span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${r.status === "used" ? "bg-green-100 text-green-800" : r.status === "active" ? "bg-blue-100 text-blue-800" : "bg-slate-200"}`}>
                            {r.status === "used" ? "использовано" : r.status === "active" ? "активен QR" : r.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Активация: {new Date(r.redeemed_at).toLocaleString("ru-RU")}
                          {r.used_at ? ` · Визит: ${new Date(r.used_at).toLocaleString("ru-RU")}` : ""}
                        </p>
                        <p className="text-xs text-slate-500">
                          Списано {r.cost_points} бон.
                          {r.user_discount_percent > 0 ? ` · скидка ${r.user_discount_percent}%` : ""}
                          {r.bill_amount_rub ? ` · чек ${r.bill_amount_rub.toLocaleString("ru-RU")} ₽ → оплата ${r.client_pays_rub?.toLocaleString("ru-RU")} ₽` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="mb-2 font-medium">История бонусов</h3>
                <div className="max-h-48 overflow-y-auto text-sm">
                  {userDetail.transactions.map(t => (
                    <div key={t.id} className="flex justify-between border-b py-1">
                      <span>{t.type}{t.source ? ` · ${t.source}` : ""}</span>
                      <span className={t.points >= 0 ? "text-green-600" : "text-red-600"}>
                        {t.points >= 0 ? "+" : ""}{t.points}
                      </span>
                    </div>
                  ))}
                </div>

                {userDetail.recentSteps.length > 0 && (
                  <>
                    <h3 className="mb-2 mt-4 font-medium">Шаги (последние дни)</h3>
                    <div className="grid gap-1 text-xs sm:grid-cols-2">
                      {userDetail.recentSteps.map(s => (
                        <div key={`${s.date}-${s.source}`} className="flex justify-between rounded bg-slate-50 px-2 py-1">
                          <span>{s.date} · {s.source}</span>
                          <span>{s.step_count.toLocaleString("ru-RU")}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "promos" && (
        <div className="space-y-6">
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="mb-1 font-semibold">Новая акция</h2>
            <p className="mb-4 text-sm text-slate-500">Все акции оплачиваются бонусами. Курс: 1000 шагов = 1 бонус.</p>
            <PromoFields form={newPromo} setForm={setNewPromo} showPartner />
            <button className="mt-4 rounded-2xl bg-primary px-4 py-2 text-white" onClick={() => savePromo(newPromo, false)}>
              Создать
            </button>
          </div>

          <div className="space-y-3">
            {promos.map(p => (
              <div key={p.id} className={`rounded-3xl border bg-white p-4 ${!p.active ? "opacity-60" : ""}`}>
                {editingPromo?.id === p.id && editForm ? (
                  <div>
                    <h3 className="mb-3 font-semibold">Редактирование</h3>
                    <PromoFields form={editForm} setForm={fn => setEditForm(f => f ? { ...fn(f), id: f.id, active: f.active } : f)} showPartner />
                    <label className="mt-3 flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={editForm.active} onChange={e => setEditForm(f => f ? { ...f, active: e.target.checked } : f)} />
                      Активна
                    </label>
                    <div className="mt-4 flex gap-2">
                      <button className="rounded-2xl bg-primary px-4 py-2 text-sm text-white" onClick={() => savePromo(editForm, true)}>Сохранить</button>
                      <button className="rounded-2xl border px-4 py-2 text-sm" onClick={() => { setEditingPromo(null); setEditForm(null); }}>Отмена</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{p.title} <span className="font-mono text-slate-400">({p.code})</span></p>
                      <p className="text-xs uppercase text-primary">{KIND_LABELS[p.kind] ?? p.kind}{p.partner_name ? ` · ${p.partner_name}` : ""}</p>
                      {p.description && <p className="text-sm text-slate-500">{p.description}</p>}
                      {p.kind === "bonus_shop" ? (
                        <p className="text-sm text-slate-500">Цена: {p.cost_points} бон. → награда: {p.reward_points} бон.</p>
                      ) : p.discount_percent > 0 ? (
                        <p className="text-sm text-slate-500">
                          {p.cost_points} бон. · скидка {p.user_cashback_percent}% · маржа {p.discount_percent}% (платформа {p.platform_fee_percent}%)
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500">{p.cost_points} бон.</p>
                      )}
                      <p className="text-xs text-slate-400">Активаций: {p.redemptions_count ?? 0} · {p.active ? "активна" : "выключена"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button className="rounded-2xl border px-3 py-1 text-sm" onClick={() => startEditPromo(p)}>Изменить</button>
                      <button className="rounded-2xl border px-3 py-1 text-sm" onClick={() => savePromo({ ...p, active: !p.active }, true)}>{p.active ? "Выкл" : "Вкл"}</button>
                      <button className="rounded-2xl border border-red-200 px-3 py-1 text-sm text-red-600" onClick={() => deletePromo(p)}>Удалить</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "settlements" && (
        <div className="space-y-6">
          {financeSummary && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Активаций всего", String(financeSummary.totalActivations)],
                ["QR активен", String(financeSummary.activeVouchers)],
                ["Использовано у партнёра", String(financeSummary.usedVouchers)],
                ["Бонусов списано", String(financeSummary.totalBonusesSpent)],
                ["Сумма чеков ₽", financeSummary.totalBillRub.toLocaleString("ru-RU")],
                ["Скидки клиентам ₽", financeSummary.totalDiscountRub.toLocaleString("ru-RU")],
                ["К оплате клиентами ₽", financeSummary.totalClientPaysRub.toLocaleString("ru-RU")],
                ["Комиссия платформе ₽", financeSummary.totalPlatformFeeRub.toLocaleString("ru-RU")]
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border bg-white p-4">
                  <p className="text-xs text-slate-500">{k}</p>
                  <p className="text-lg font-semibold">{v}</p>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto rounded-3xl border bg-white">
            <p className="border-b p-4 font-medium">Все активации акций</p>
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="p-3">Дата</th>
                  <th className="p-3">Клиент</th>
                  <th className="p-3">Акция</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3">Бонусы</th>
                  <th className="p-3">Чек ₽</th>
                  <th className="p-3">Скидка ₽</th>
                  <th className="p-3">К оплате ₽</th>
                </tr>
              </thead>
              <tbody>
                {allRedemptions.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="p-3 whitespace-nowrap">{new Date(r.redeemed_at).toLocaleString("ru-RU")}</td>
                    <td className="p-3">{r.user_name}{r.username ? ` @${r.username}` : ""}</td>
                    <td className="p-3">{r.promo_title} <span className="text-slate-400">({r.promo_code})</span></td>
                    <td className="p-3">{r.status === "used" ? "✓ у партнёра" : r.status === "active" ? "QR активен" : r.status}</td>
                    <td className="p-3">{r.cost_points}</td>
                    <td className="p-3">{r.bill_amount_rub ? `${r.bill_amount_rub.toLocaleString("ru-RU")}` : "—"}</td>
                    <td className="p-3">{r.discount_amount_rub ? `${r.discount_amount_rub.toLocaleString("ru-RU")}` : "—"}</td>
                    <td className="p-3">{r.client_pays_rub ? `${r.client_pays_rub.toLocaleString("ru-RU")}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-3xl border bg-white">
            <p className="border-b p-4 text-sm text-slate-500">
              Подтверждённые визиты партнёров · Mini App:{" "}
              <code className="text-xs">https://t.me/WeGoWithSputnik_bot?startapp=partner</code>
            </p>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="p-3">Дата</th>
                <th className="p-3">Партнёр</th>
                <th className="p-3">Клиент</th>
                <th className="p-3">Чек</th>
                <th className="p-3">Скидка ₽</th>
                <th className="p-3">К оплате</th>
                <th className="p-3">Платформе ₽</th>
                <th className="p-3">Статус</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id} className="border-b">
                  <td className="p-3 whitespace-nowrap">{new Date(s.confirmed_at).toLocaleString("ru-RU")}</td>
                  <td className="p-3">{s.partner_name}</td>
                  <td className="p-3">{s.user_name}</td>
                  <td className="p-3">{s.bill_amount_rub?.toLocaleString("ru-RU")} ₽</td>
                  <td className="p-3">{s.discount_amount_rub?.toLocaleString("ru-RU")} ₽ ({s.user_discount_percent}%)</td>
                  <td className="p-3">{s.client_pays_rub?.toLocaleString("ru-RU")} ₽</td>
                  <td className="p-3">{s.platform_fee_amount_rub?.toLocaleString("ru-RU")} ₽</td>
                  <td className="p-3">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {settlements.length === 0 && <p className="p-6 text-center text-slate-400">Пока нет подтверждённых визитов</p>}
          </div>

          {partnerEvents.length > 0 && (
            <div className="rounded-3xl border bg-white p-4">
              <h3 className="mb-3 font-medium">Журнал партнёрских событий</h3>
              <ul className="max-h-64 space-y-1 overflow-y-auto text-xs text-slate-600">
                {partnerEvents.map(e => (
                  <li key={e.id} className="flex justify-between gap-2 border-b py-1">
                    <span>{e.event}{e.partner_name ? ` · ${e.partner_name}` : ""}</span>
                    <span className={e.status === "error" ? "text-red-600" : "text-slate-400"}>
                      {new Date(e.created_at).toLocaleString("ru-RU")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "logs" && logs.length > 0 && (
        <div className="overflow-x-auto rounded-3xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="p-3">Время</th>
                <th className="p-3">Пользователь</th>
                <th className="p-3">Источник</th>
                <th className="p-3">Период</th>
                <th className="p-3">Шаги</th>
                <th className="p-3">Бонусы</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b">
                  <td className="p-3">{new Date(l.created_at).toLocaleString("ru-RU")}</td>
                  <td className="p-3">{l.first_name ?? "—"}</td>
                  <td className="p-3">{l.source}</td>
                  <td className="p-3">{l.period}</td>
                  <td className="p-3">{l.steps_synced.toLocaleString("ru-RU")}</td>
                  <td className="p-3">+{l.bonus_awarded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg space-y-5 rounded-3xl border bg-white p-6">
          <p className="text-sm text-slate-500">Глобальные параметры экономики. Изменения применяются ко всем пользователям.</p>

          <Field label="Шагов за 1 бонус" hint="Сколько шагов нужно пройти, чтобы получить 1 бонус. Сейчас: 1000 шагов = 1 бонус">
            <input
              type="number"
              min={1}
              value={settings.steps_per_bonus ?? "1000"}
              onChange={e => setSettings(s => ({ ...s, steps_per_bonus: e.target.value }))}
              className={inputCls()}
            />
          </Field>

          <Field label="Приветственный бонус" hint="Сколько бонусов получает новый пользователь при активации WELCOME50. Обновляет промокод автоматически">
            <input
              type="number"
              min={0}
              value={settings.welcome_bonus ?? "5"}
              onChange={e => setSettings(s => ({ ...s, welcome_bonus: e.target.value }))}
              className={inputCls()}
            />
          </Field>

          <Field label="Бонус за реферала" hint="Сколько бонусов получает пригласивший, когда друг регистрируется">
            <input
              type="number"
              min={0}
              value={settings.referral_bonus ?? "10"}
              onChange={e => setSettings(s => ({ ...s, referral_bonus: e.target.value }))}
              className={inputCls()}
            />
          </Field>

          <button className="rounded-2xl bg-primary px-4 py-2 text-white" onClick={saveSettings}>Сохранить</button>
        </div>
      )}

      {status && <p className="mt-4 text-sm text-slate-600">{status}</p>}
    </main>
  );
}
