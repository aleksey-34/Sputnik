# Настройка Telegram Mini App «Спутник»

Пошаговая инструкция для новичка.

---

## Шаг 1. Создайте бота в Telegram

1. Откройте Telegram и найдите **@BotFather**
2. Отправьте команду `/newbot`
3. Введите имя бота: `Спутник`
4. Введите username (должен заканчиваться на `bot`): например `sputnik_steps_bot`
5. BotFather пришлёт **токен** вида `7123456789:AAH...` — сохраните его
6. Запишите username бота — он понадобится для `.env`:
   ```
   TELEGRAM_BOT_TOKEN=7123456789:AAH...
   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=sputnik_steps_bot
   ```

---

## Шаг 2. Создайте Mini App (Web App)

1. В чате с @BotFather отправьте `/mybots`
2. Выберите вашего бота → **Bot Settings** → **Menu Button**
3. Нажмите **Configure menu button**
4. Укажите:
   - **Button text**: `Открыть Спутник` (или любой текст)
   - **Web App URL**: `https://YOUR_DOMAIN` (ваш домен на Vercel или VPS)

   Альтернатива — команда напрямую:
   ```
   /newapp
   ```
   Выберите бота и следуйте инструкциям BotFather.

---

## Шаг 2b. Кнопки «Основное приложение» и «Партнёр» в боте

Menu Button в BotFather — только одна. Вторую кнопку даёт **webhook** бота: на `/start` и `/partner` бот присылает инлайн-клавиатуру.

1. Убедитесь, что в `.env` на сервере задан `TELEGRAM_BOT_TOKEN` и `APP_URL=https://sputnik.battletoads.top`
2. После деплоя зарегистрируйте webhook (на VPS):

```bash
source /opt/sputnik/.env
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://sputnik.battletoads.top/api/telegram/webhook\",\"allowed_updates\":[\"message\"]}"
```

Токен — **без** `${}` вокруг самого значения. Неверно: `bot${8901039724:AAH...}` — верно: `bot${TELEGRAM_BOT_TOKEN}` после `source .env`.

Если `curl` на VPS падает с `Killed` — выполните команду **с локального компьютера** (тот же URL и JSON).

3. Проверка: напишите боту `/start` — должны появиться две кнопки:
   - **Основное приложение** → Mini App
   - **Партнёрский раздел** → `/partner`

Партнёрам можно давать прямую ссылку: `https://t.me/WeGoWithSputnik_bot?startapp=partner`

---

## Шаг 3. Настройте домен

Mini App **обязательно** работает по HTTPS.

### Вариант A: Vercel (рекомендуется для frontend)

1. Зайдите на [vercel.com](https://vercel.com), подключите GitHub-репозиторий
2. Добавьте Environment Variables из `.env.example`
3. Deploy → получите URL вида `https://sputnik-xxx.vercel.app`
4. Этот URL укажите в BotFather как Web App URL

### Вариант B: VPS

1. Настройте домен A-запись на IP вашего VPS
2. Запустите деплой: `sudo bash scripts/vps-deploy.sh git@github.com:YOU/sputnik.git`
3. Настройте nginx (`scripts/nginx-sputnik.conf`) + SSL через certbot
4. URL: `https://your-domain.com`

**Важно:** файл `/opt/sputnik/.env` не хранится в Git. При деплое используйте `git pull`, не `rsync --delete` — иначе `.env` можно случайно удалить.

Перезапуск на VPS: `bash scripts/pm2-restart.sh` (убивает зависший процесс на порту 3000).

---

## Шаг 4. Google Fit OAuth (опционально)

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте проект → **APIs & Services** → **Enable APIs** → включите **Fitness API**
3. **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized redirect URIs:
   ```
   https://YOUR_DOMAIN/api/google-fit/callback
   ```
6. Скопируйте Client ID и Client Secret в `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URL=https://YOUR_DOMAIN/api/google-fit/callback
   ```

---

## Шаг 5. Реферальная система

Реферальная ссылка (важно: `startapp`, не `start`):
```
https://t.me/YOUR_BOT_USERNAME?startapp=TELEGRAM_USER_ID
```

Когда новый пользователь переходит по ссылке и открывает Mini App:
- Telegram передаёт `start_param` в initData
- Пригласившему начисляются бонусы (см. настройки `referral_bonus`)

---

## Шаг 6. Админка промокодов

Создать промокод через API:

```bash
curl -X POST https://YOUR_DOMAIN/api/promocodes \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{
    "code": "SPRING2026",
    "title": "Весенняя акция",
    "description": "100 бонусов за 50",
    "cost_points": 50,
    "reward_points": 100
  }'
```

---

## Шаг 7. Проверка

1. Откройте бота в Telegram
2. Нажмите кнопку меню / «Открыть Спутник»
3. Должен произойти автоматический вход
4. Заполните профиль (рост, вес, пол, возраст)
5. Введите шаги вручную или подключите Google Fit
6. Проверьте начисление бонусов (1 за 1000 шагов)

---

## Частые проблемы

| Проблема | Решение |
|----------|---------|
| «Невалидные данные Telegram» | Проверьте `TELEGRAM_BOT_TOKEN` — токен именно этого бота |
| Приложение не открывается в Telegram | URL должен быть HTTPS, без localhost |
| Google Fit не работает | Проверьте redirect URI и включённый Fitness API |
| БД недоступна | Проверьте `DATABASE_URL`, запустите `scripts/db-init.sql` |
| 401 при запросах API | Откройте app через Telegram (нужна cookie авторизации) |
