# Google Fit — две разные настройки

## Главное: кто что делает

| Кто | Что делает | Как часто |
|-----|------------|-----------|
| **Ты (владелец «Спутника»)** | Создаёшь проект в Google Cloud, получаешь `CLIENT_ID` и `SECRET`, кладёшь в `.env` на сервере | **Один раз** |
| **Каждый пользователь** | Жмёт «Подключить Google Fit» в Telegram → входит в **свой** Gmail → разрешает доступ | **Один раз на человека** |

Пользователям **не нужен** Google Cloud Console. Они просто логинятся в Google, как «Войти через Google» на любом сайте.

---

## Часть A — для тебя (разработчик, один раз)

### 1. Google Cloud Console

1. Открой https://console.cloud.google.com/
2. Войди в свой Google-аккаунт
3. **Select a project** → **New Project** → имя: `Sputnik` → Create
4. Убедись, что выбран проект **Sputnik** (вверху слева)

### 2. Включить Fitness API

1. **APIs & Services** → **Library**
2. Поиск: `Fitness API`
3. **Google Fitness API** → **Enable**

### 3. OAuth consent screen (экран согласия)

1. **APIs & Services** → **OAuth consent screen**
2. User Type: **External** → Create
3. App name: `Спутник`, email поддержки — твой
4. Scopes → Add → `.../auth/fitness.activity.read` → Save
5. Test users → Add → добавь свой Gmail (пока приложение в тесте)
6. Save

### 4. Credentials (ключи для `.env`)

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `Sputnik Web`
4. **Authorized redirect URIs** — добавь **точно**:
   ```
   https://sputnik.battletoads.top/api/google-fit/callback
   ```
5. Create → скопируй **Client ID** и **Client secret**

### 5. На VPS в `/opt/sputnik/.env`

```env
GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URL=https://sputnik.battletoads.top/api/google-fit/callback
```

```bash
pm2 restart sputnik --update-env
```

После этого кнопка «Подключить Google Fit» заработает для всех пользователей.

---

## Часть B — для пользователя (инструкция в Mini App)

Эта инструкция уже встроена в приложение (блок «Как подключить шаги с телефона?»).

### Кратко для пользователя

**0. Google-почта** (если нет)  
→ accounts.google.com → Создать аккаунт → Gmail + пароль

**1. Google Fit на телефоне** (Android)  
→ Google Play → «Google Fit» → установить → войти в Google → разрешить активность → пройти 50 шагов

**2. В боте @WeGoWithSputnik_bot**  
→ Открыть Спутник → «Подключить Google Fit» → выбрать **свой** аккаунт → Разрешить

**3. Синхронизация**  
→ Выбрать период → «Синхронизировать шаги»

### iPhone

Apple Health из Telegram Mini App **не подключается**. Варианты:
- Установить Google Fit на iOS и синхронизировать через него
- Вводить шаги вручную

---

## Частые вопросы

**Пользователь спрашивает «где взять CLIENT_ID?»**  
→ Нигде. Это только у владельца приложения. Ему нужен только свой Gmail.

**«Access blocked: app not verified»**  
→ Пока приложение в режиме Testing, добавь Gmail пользователя в Test users в OAuth consent screen. Для публичного запуска — пройти verification Google (позже).

**Шаги = 0 после синхронизации**  
→ Проверь, что Google Fit на телефоне считает шаги и пользователь вошёл в тот же Google-аккаунт.
