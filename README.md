# Sputnik Mini App

Telegram Mini App для трекинга шагов, начисления бонусов и активации промокодов.

## Стек

- **Frontend:** Next.js 15 (App Router) + TypeScript + TailwindCSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Telegram Web App SDK (initData validation)
- **Hosting:** Vercel (frontend) + VPS (PostgreSQL, опционально full-stack)

## Структура проекта

```
Sputnik/
├── app/
│   ├── api/
│   │   ├── auth/route.ts          # Telegram авторизация
│   │   ├── profile/route.ts       # Профиль + баланс бонусов
│   │   ├── steps/route.ts         # Сохранение шагов + начисление бонусов
│   │   ├── promocodes/
│   │   │   ├── route.ts           # CRUD промокодов (admin)
│   │   │   └── redeem/route.ts    # Активация промокода
│   │   └── google-fit/
│   │       ├── auth/route.ts      # OAuth redirect
│   │       └── callback/route.ts  # OAuth callback + sync steps
│   ├── layout.tsx                 # Root layout + Telegram SDK script
│   ├── page.tsx                   # Главная страница Mini App
│   └── globals.css
├── lib/
│   ├── db/schema.ts               # Drizzle схема
│   ├── drizzle.ts                 # DB connection
│   ├── server/
│   │   ├── auth.ts                # User CRUD + referrals
│   │   └── google-fit.ts          # Google Fit API
│   └── utils/telegram.ts          # initData validation
├── scripts/
│   ├── db-init.sql                # SQL инициализация
│   ├── vps-setup-postgres.sh      # Установка PostgreSQL на VPS
│   ├── vps-deploy.sh              # Полный деплой на VPS
│   └── nginx-sputnik.conf         # Пример nginx
├── docs/
│   └── TELEGRAM_SETUP.md          # Инструкция по Mini App
├── next.config.mjs
├── .env.example
└── package.json
```

## Быстрый старт (локально)

```bash
npm install
cp .env.example .env
# Заполните .env

psql "$DATABASE_URL" -f scripts/db-init.sql
npm run dev
```

Откройте http://localhost:3000 (полная авторизация работает только внутри Telegram).

## Деплой

### GitHub

```bash
git init
git add .
git commit -m "Initial Sputnik Mini App"
git remote add origin git@github.com:USER/sputnik.git
git push -u origin main
```

### Vercel

1. Import проекта из GitHub
2. Добавьте env variables из `.env.example`
3. Deploy

### VPS

```bash
# 1. PostgreSQL
sudo bash scripts/vps-setup-postgres.sh

# 2. Деплой приложения
sudo bash scripts/vps-deploy.sh git@github.com:USER/sputnik.git

# 3. Nginx + SSL
sudo cp scripts/nginx-sputnik.conf /etc/nginx/sites-available/sputnik
# Отредактируйте YOUR_DOMAIN
sudo ln -s /etc/nginx/sites-available/sputnik /etc/nginx/sites-enabled/
sudo certbot --nginx -d YOUR_DOMAIN
```

Подробная инструкция по Telegram Mini App: [docs/TELEGRAM_SETUP.md](docs/TELEGRAM_SETUP.md)

## API Endpoints

| Method | Path | Описание |
|--------|------|----------|
| POST | `/api/auth` | Авторизация через Telegram initData |
| GET | `/api/profile` | Профиль, баланс, шаги за сегодня |
| POST | `/api/profile` | Сохранение профиля |
| POST | `/api/steps` | Запись шагов (manual / google-fit) |
| GET | `/api/promocodes` | Список активных промокодов |
| POST | `/api/promocodes` | Создание промокода (x-admin-key) |
| POST | `/api/promocodes/redeem` | Активация промокода |
| GET | `/api/google-fit/auth` | OAuth redirect |
| GET | `/api/google-fit/callback` | OAuth callback |

## Бонусная система

- **1 бонус** за каждые **1000 шагов** (защита от двойного начисления)
- **25 бонусов** за каждого приглашённого пользователя (реферальная ссылка)
- Промокоды: списание `cost_points`, начисление `reward_points`
