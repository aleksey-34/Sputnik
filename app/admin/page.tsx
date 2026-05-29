"use client";

import { useCallback, useEffect, useState } from "react";

type Stats = { users: number; syncs: number; totalBonuses: number; totalSteps: number };
type UserRow = {
  id: number;
  telegram_id: string;
  first_name: string;
  username?: string;
  bonusPoints: number;
  totalSteps: number;
  created_at: string;
};
type Promo = {
  id: number;
  code: string;
  title: string;
  description?: string;
  cost_points: number;
  reward_points: number;
  active: boolean;
};
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

type Tab = "dashboard" | "users" | "promos" | "logs" | "settings";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [newPromo, setNewPromo] = useState({ code: "", title: "", description: "", cost_points: 0, reward_points: 0 });

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

  const loadTab = async (t: Tab) => {
    setTab(t);
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

  const createPromo = async () => {
    const res = await fetch("/api/admin/promocodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPromo)
    });
    if (res.ok) {
      setStatus("Промокод создан");
      setNewPromo({ code: "", title: "", description: "", cost_points: 0, reward_points: 0 });
      loadTab("promos");
    }
  };

  const togglePromo = async (p: Promo) => {
    await fetch("/api/admin/promocodes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, active: !p.active })
    });
    loadTab("promos");
  };

  const saveSettings = async () => {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    setStatus(res.ok ? "Настройки сохранены" : "Ошибка сохранения");
  };

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
        <div className="overflow-x-auto rounded-3xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Имя</th>
                <th className="p-3">Telegram</th>
                <th className="p-3">Шаги</th>
                <th className="p-3">Бонусы</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b">
                  <td className="p-3">{u.id}</td>
                  <td className="p-3">{u.first_name}</td>
                  <td className="p-3">@{u.username ?? u.telegram_id}</td>
                  <td className="p-3">{u.totalSteps.toLocaleString("ru-RU")}</td>
                  <td className="p-3">{u.bonusPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "promos" && (
        <div className="space-y-6">
          <div className="rounded-3xl border bg-white p-6">
            <h2 className="mb-4 font-semibold">Новая акция</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input placeholder="Код" value={newPromo.code} onChange={e => setNewPromo(p => ({ ...p, code: e.target.value }))} className="rounded-2xl border px-3 py-2" />
              <input placeholder="Название" value={newPromo.title} onChange={e => setNewPromo(p => ({ ...p, title: e.target.value }))} className="rounded-2xl border px-3 py-2" />
              <input placeholder="Описание" value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))} className="rounded-2xl border px-3 py-2 md:col-span-2" />
              <input type="number" placeholder="Стоимость" value={newPromo.cost_points} onChange={e => setNewPromo(p => ({ ...p, cost_points: Number(e.target.value) }))} className="rounded-2xl border px-3 py-2" />
              <input type="number" placeholder="Награда" value={newPromo.reward_points} onChange={e => setNewPromo(p => ({ ...p, reward_points: Number(e.target.value) }))} className="rounded-2xl border px-3 py-2" />
            </div>
            <button className="mt-4 rounded-2xl bg-primary px-4 py-2 text-white" onClick={createPromo}>Создать</button>
          </div>
          <div className="space-y-3">
            {promos.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-3xl border bg-white p-4">
                <div>
                  <p className="font-semibold">{p.title} <span className="text-slate-400">({p.code})</span></p>
                  <p className="text-sm text-slate-500">{p.cost_points} → {p.reward_points} бонусов</p>
                </div>
                <button className="rounded-2xl border px-3 py-1 text-sm" onClick={() => togglePromo(p)}>
                  {p.active ? "Выключить" : "Включить"}
                </button>
              </div>
            ))}
          </div>
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
        <div className="max-w-md space-y-4 rounded-3xl border bg-white p-6">
          <label className="block space-y-1">
            Шагов за 1 бонус
            <input
              type="number"
              value={settings.steps_per_bonus ?? "1000"}
              onChange={e => setSettings(s => ({ ...s, steps_per_bonus: e.target.value }))}
              className="w-full rounded-2xl border px-3 py-2"
            />
          </label>
          <label className="block space-y-1">
            Бонус за реферала
            <input
              type="number"
              value={settings.referral_bonus ?? "25"}
              onChange={e => setSettings(s => ({ ...s, referral_bonus: e.target.value }))}
              className="w-full rounded-2xl border px-3 py-2"
            />
          </label>
          <button className="rounded-2xl bg-primary px-4 py-2 text-white" onClick={saveSettings}>Сохранить</button>
        </div>
      )}

      {status && <p className="mt-4 text-sm text-slate-600">{status}</p>}
    </main>
  );
}
