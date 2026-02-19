# News Aggregator

Интеллектуальный агрегатор технологических новостей (программирование, AI, ОС).

**Сайт:** https://darksidr.ru

## Стек

- **Frontend:** SvelteKit 5 (Runes) + TypeScript + TailwindCSS
- **База данных:** PostgreSQL 16 + Drizzle ORM
- **AI-перевод:** Cloudflare Workers AI (EN→RU)
- **Деплой:** Docker + Caddy (auto-SSL) + GitHub Actions

## Источники новостей

OpenNET, Habr, HackerNews, Phoronix, TechCrunch AI, Google Web.dev, MDN Blog, Microsoft TypeScript, CNCF Blog, The Verge, Wired, Ars Technica, Dev.to, React, GitHub Blog, OpenAI, PostgreSQL

## Разработка

```bash
cp .env.example .env   # заполни переменные
npm install
npm run dev
```

Нужен PostgreSQL. Быстрый запуск через Docker:
```bash
docker run -d --name pg \
  -e POSTGRES_DB=news \
  -e POSTGRES_USER=news \
  -e POSTGRES_PASSWORD=dev \
  -p 5432:5432 postgres:16-alpine
```

### Команды

```bash
npm run dev          # dev-сервер
npm run build        # production сборка
npm run check        # TypeScript проверка
npm run test:run     # тесты
npm run db:push      # применить схему БД
npm run db:generate  # сгенерировать миграцию
```

## Переменные окружения

| Переменная | Обязательно | Описание |
|-----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `CRON_SECRET` | ✅ | Секрет для защиты `/api/cron/fetch` |
| `CF_ACCOUNT_ID` | — | Cloudflare account ID (перевод) |
| `CF_AI_TOKEN` | — | Cloudflare AI token (перевод) |
| `SITE_PROTECTION_USER` | — | Basic auth логин |
| `SITE_PROTECTION_PASSWORD` | — | Basic auth пароль |

Пример: `.env.example`

## API

### `POST /api/cron/fetch`
Запускает сбор новостей из всех источников.

```bash
curl -X POST https://darksidr.ru/api/cron/fetch \
  -H "Authorization: Bearer $CRON_SECRET"
```

Запускается автоматически каждые 15 минут через cron.

## Деплой на VPS

Подробная инструкция: [DEPLOY.md](DEPLOY.md)

**Кратко:**
1. Ubuntu 22.04 + Docker
2. Caddy как reverse proxy (auto-SSL)
3. `git clone` → `.env` → `docker compose up -d`
4. Миграции БД → первый запуск cron
5. GitHub Actions автодеплой при push в `main`

### Структура на сервере

```
/srv/caddy/    ← Caddy reverse proxy (общий для всех проектов)
/srv/news/     ← этот проект
```

### Полезные команды на сервере

```bash
# Логи
docker compose -f /srv/news/docker-compose.yml logs -f app

# Статус
docker compose -f /srv/news/docker-compose.yml ps

# Ручной деплой
cd /srv/news && git pull && docker compose build app && docker compose up -d app

# Бэкап БД
docker compose -f /srv/news/docker-compose.yml exec postgres \
  pg_dump -U news news > backup_$(date +%Y%m%d).sql

# Ресурсы
docker stats

# Статистика статей по источникам + итого
docker compose -f /srv/news/docker-compose.yml exec postgres psql -U news -d news -c "
SELECT COALESCE(fs.name, '=== ИТОГО ===') as name,
       COUNT(a.id) as total,
       SUM(CASE WHEN a.is_translated THEN 1 ELSE 0 END) as translated
FROM articles a
JOIN feed_sources fs ON a.source_id = fs.id
GROUP BY ROLLUP(fs.name)
ORDER BY (fs.name IS NULL), total DESC;"
```

## Автодеплой (GitHub Actions)

При push в `main`:
1. SSH подключение к серверу
2. `git pull`
3. Пересборка Docker-образа
4. Перезапуск контейнера приложения

**Требуемые GitHub Secrets:**

| Secret | Значение |
|--------|---------|
| `VPS_HOST` | IP сервера |
| `VPS_USER` | Пользователь SSH (root) |
| `VPS_SSH_KEY` | Приватный SSH ключ |
| `VPS_PORT` | SSH порт (22) |

## Структура проекта

```
src/
  lib/server/
    db/           ← PostgreSQL + Drizzle (schema, migrations, repository)
    sources/      ← RSS источники
    services/     ← translation-service (Cloudflare AI)
    jobs/         ← feed-fetcher (cron логика)
    news-service.ts  ← in-memory fallback (без БД)
  routes/
    +page.svelte     ← главная страница
    api/cron/fetch/  ← cron endpoint
```
