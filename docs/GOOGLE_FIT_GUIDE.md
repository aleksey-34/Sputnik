# Google Fit — настройка OAuth

## Кто что делает

| Кто | Что делает |
|-----|------------|
| **Владелец «Спутника»** | Google Cloud Console, ключи в `.env`, публикация OAuth |
| **Пользователь** | «Подключить Google Fit» → свой Gmail → Разрешить |

Пользователям **не нужен** Google Cloud Console.

---

## Часть A — разработчик (один раз)

### 1. Google Cloud Console

1. https://console.cloud.google.com/ → проект **Sputnik**
2. **APIs & Services** → **Library** → **Google Fitness API** → **Enable**

### 2. Credentials

1. **Google Auth Platform** → **Clients** → **Create Credentials** → **OAuth client ID**
2. Type: **Web application**
3. **Authorized redirect URIs**:
   ```
   https://sputnik.battletoads.top/api/google-fit/callback
   ```
4. Скопируй Client ID и Client secret

### 3. Публикация OAuth (для всех пользователей без Test users)

**Подробная инструкция:** [GOOGLE_OAUTH_PUBLISH.md](./GOOGLE_OAUTH_PUBLISH.md)

Кратко:

1. **Branding** — заполни ссылки:
   - Home: `https://sputnik.battletoads.top/about`
   - Privacy: `https://sputnik.battletoads.top/privacy`
   - Terms: `https://sputnik.battletoads.top/terms`
2. **Data Access** — scope `fitness.activity.read`
3. **Audience** → **Publish app** (убирает необходимость Test users)
4. **Verification Center** → Submit (убирает экран «не проверено», снимает лимит 100)

### 4. `.env` на VPS

```env
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URL=https://sputnik.battletoads.top/api/google-fit/callback
```

```bash
pm2 restart sputnik --update-env
```

---

## Часть B — пользователь

Инструкция встроена в Mini App (блок «Как подключить шаги с телефона?»).

1. Установить **Google Fit**, войти в Google, пройти ~50 шагов
2. В боте @WeGoWithSputnik_bot → «Подключить Google Fit» → Разрешить
3. «Синхронизировать шаги»

**iPhone:** Apple Health напрямую не подключается — только через Google Fit или ручной ввод.

---

## Частые проблемы

| Ошибка | Решение |
|--------|---------|
| `403 access_denied`, «не прошло проверку» | Приложение в **Testing** → нажми **Publish app** (см. GOOGLE_OAUTH_PUBLISH.md) |
| «Приложение не проверено» (можно продолжить) | Нормально до верификации → **Дополнительные настройки** → **Перейти в Спутник** |
| Шаги = 0 | Google Fit считает шаги? Тот же Gmail? |
| CLIENT_ID у пользователя | Не нужен — только свой Gmail |

---

## Публичные страницы (для Google)

- О приложении: https://sputnik.battletoads.top/about
- Конфиденциальность: https://sputnik.battletoads.top/privacy
- Условия: https://sputnik.battletoads.top/terms
