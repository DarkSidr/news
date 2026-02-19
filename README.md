# Daily Dev News

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

### `GET /api/articles`
Публичный endpoint для получения последних статей. Используется n8n и внешними интеграциями.

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|---------|
| `limit` | number | 20 | Максимум статей (не более 100) |
| `since` | ISO 8601 | — | Фильтр по дате публикации |

```bash
# Последние 20 новостей
curl https://darksidr.ru/api/articles

# Новости за последние 15 минут
curl "https://darksidr.ru/api/articles?limit=50&since=2026-02-19T10:00:00Z"
```

**Ответ:**
```json
[
  {
    "id": "abc123",
    "title": "Original title",
    "translatedTitle": "Переведённый заголовок",
    "snippet": "Краткое описание...",
    "link": "https://example.com/article",
    "pubDate": "2026-02-19T10:00:00.000Z",
    "source": "HackerNews",
    "language": "en"
  }
]
```

## Telegram-автопостинг (n8n)

Воркфлоу в n8n автоматически публикует новости в Telegram-канал [@daily_dev_news](https://t.me/daily_dev_news).

### Схема воркфлоу

```
Schedule Trigger (каждую минуту)
  → HTTP Request: GET /api/articles?limit=1000&since=<15 мин назад>
  → Filter: только статьи с translatedTitle
  → SQL: SELECT NOT EXISTS (... WHERE article_id = $1) AS is_new
  → If: is_new = true
  → Limit: 1 статья за запуск (защита от флуда)
  → HTTP Request: POST api.telegram.org/sendMessage
  → SQL: INSERT INTO telegram_sent_articles (article_id)
```

### Формат поста

```
📰 <b>Переведённый заголовок</b>

Краткое описание статьи...

📌 HackerNews
🔗 Оригинал

Больше новостей на darksidr.ru
```

### Дедупликация

Таблица `telegram_sent_articles` хранит ID отправленных статей. Перед отправкой каждая статья проверяется — уже отправленные пропускаются. Старые записи автоматически очищаются вместе со старыми новостями (ротация 14 дней).

### Настройка

1. В n8n создать Postgres credential с параметрами подключения к БД
2. Импортировать воркфлоу из `n8n-workflow.json` (если есть)
3. Указать Telegram bot token и chat_id
4. Активировать воркфлоу

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
