# Публикация Google OAuth — доступ для всех пользователей

Чтобы **не добавлять каждого пользователя в Test users вручную**, нужно опубликовать приложение и пройти верификацию Google для scope `fitness.activity.read`.

## URL-адреса (уже на сайте)

Заполни **Branding** в Google Cloud Console этими ссылками:

| Поле | URL |
|------|-----|
| Application home page | `https://sputnik.battletoads.top/about` |
| Privacy policy | `https://sputnik.battletoads.top/privacy` |
| Terms of service | `https://sputnik.battletoads.top/terms` |
| Authorized domain | `battletoads.top` (уже есть) |

App name: **Спутник**  
User support email: **foresterufa@gmail.com**  
Developer contact: **foresterufa@gmail.com**

---

## Пошагово в Google Cloud Console

Проект: **Sputnik** → [Google Auth Platform](https://console.cloud.google.com/auth)

### Шаг 1 — Branding

1. **Branding** → заполни все три ссылки (см. таблицу выше)
2. По желанию загрузи лого 120×120 px
3. **Save**

### Шаг 2 — Data Access (Scopes)

1. **Data Access** → **Add or remove scopes**
2. Убедись, что есть: `https://www.googleapis.com/auth/fitness.activity.read`
   - Название: *See your fitness activity data*
   - Тип: **Sensitive**
3. **Save**

### Шаг 3 — Publish app

1. **Audience** → **Publishing status: Testing**
2. Нажми **Publish app** → подтверди
3. Статус станет **In production**

После публикации **Test users больше не нужны** — любой Gmail может авторизоваться.

> ⚠️ До верификации Google может показывать экран «Приложение не проверено». Пользователь нажимает **Дополнительные настройки** → **Перейти в приложение «Спутник» (небезопасно)**. Это нормально на этапе запуска.

### Шаг 4 — Verification (убрать предупреждение и снять лимит 100)

1. **Verification Center** → **Prepare for verification** / **Submit for verification**
2. Заполни форму:

**Why do you need this scope?** (на английском для Google):

```
Sputnik is a Telegram Mini App that rewards users with bonus points for physical activity.
We use fitness.activity.read solely to read daily step counts from Google Fit so users can
earn bonuses automatically. We do not access location, heart rate, sleep, or any other
fitness data. Step data is stored on our server only for bonus calculation and is not
sold or shared with third parties. Privacy policy: https://sputnik.battletoads.top/privacy
```

**How does your app use the data?**

```
1. User taps "Connect Google Fit" in Telegram Mini App
2. User grants consent via Google OAuth
3. App reads step_count.delta aggregated by day
4. Steps convert to bonus points (1000 steps = 1 bonus)
5. User can revoke access anytime in Google Account settings
```

3. Приложи ссылку на **privacy policy** и **demo video** (если попросят):
   - Запиши 1–2 мин экрана: открыть бота → Подключить Google Fit → Разрешить → Синхронизировать шаги
   - Залей на YouTube (unlisted) и вставь ссылку

4. **Submit**

Срок проверки: обычно **3–10 рабочих дней**. Статус смотри в Verification Center.

---

## Credentials (проверь ещё раз)

**Clients** → OAuth 2.0 Client ID → **Authorized redirect URIs**:

```
https://sputnik.battletoads.top/api/google-fit/callback
```

На VPS в `/opt/sputnik/.env`:

```env
GOOGLE_CLIENT_ID=554978103939-....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URL=https://sputnik.battletoads.top/api/google-fit/callback
```

```bash
pm2 restart sputnik --update-env
```

---

## Что видит пользователь после Publish

| Этап | Test users | Экран Google | Лимит |
|------|------------|--------------|-------|
| Testing | ✅ нужны вручную | Access blocked 403 | 100 |
| Production, не verified | ❌ не нужны | «Не проверено» → можно продолжить | ~100* |
| Production, verified | ❌ | Обычный экран «Разрешить» | без лимита |

\* Google может ограничивать непроверенные sensitive scopes; верификация снимает ограничение.

---

## Чеклист «готово к Publish»

```
☐ https://sputnik.battletoads.top/about — открывается
☐ https://sputnik.battletoads.top/privacy — открывается
☐ https://sputnik.battletoads.top/terms — открывается
☐ Branding заполнен, Save
☐ Scope fitness.activity.read добавлен
☐ Publish app нажат
☐ (опционально) Submit for verification
```

После **Publish app** попроси Ирину или любого пользователя снова нажать «Подключить Google Fit» — 403 access_denied уйдёт.
