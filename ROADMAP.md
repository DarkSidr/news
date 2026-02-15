# ROADMAP — Поэтапный план разработки для AI-агентов

> **Дата создания:** 15.02.2026
> **Источник:** Архитектурный анализ текущего состояния vs `TECHNICAL_PLAN.md`
> **Цель:** Пошаговые инструкции для AI-агентов (Claude, Codex, и др.) по реализации оставшейся функциональности.

---

## Как пользоваться этим файлом

1. **Перед началом работы** — прочитай `AI_MEMORY.md` (текущий статус) и этот файл.
2. **Выбери этап** — работай строго по порядку (Stage 2 → 3 → 4 → ...).
3. **Внутри этапа** — выполняй задачи по приоритету (P0 → P1 → P2).
4. **После завершения задачи** — отметь `[x]` в этом файле и обнови `AI_MEMORY.md`.
5. **После завершения этапа** — запроси ревью у пользователя.

---

## Текущее состояние (15.02.2026)

- **Stage 1** — Выполнен (RSS агрегация, UI, Masonry, Dark Mode)
- **Stage 1.5** — Выполнен (Theme switcher, content:encoded, фильтрация, 23+ тестов)
- **Оценка:** 6.4–8.2/10 (в зависимости от ревью)
- **MINOR_ISSUES.md:** Все пункты Stage 1 и 1.5 — Готово

### Текущая файловая структура (ключевые файлы)
```
src/
├── lib/
│   ├── types.ts                    # NewsItem интерфейс
│   ├── server/
│   │   ├── news-service.ts         # Основной сервис (fetch + cache + parse)
│   │   ├── news-utils.ts           # Утилиты (strip, normalize, extract)
│   │   └── news-utils.test.ts      # 23+ unit-тестов
│   └── components/
│       ├── NewsCard.svelte          # Карточка новости
│       ├── MasonryGrid.svelte       # JS-based masonry layout
│       └── ThemeToggle.svelte       # Переключатель темы
├── routes/
│   ├── +page.svelte                 # Главная (лента новостей)
│   ├── +page.server.ts              # Server load (fetchAllNews)
│   ├── +layout.svelte               # Layout (Schema.org, meta)
│   ├── +error.svelte                # Error page
│   └── news/[id]/
│       ├── +page.svelte             # Деталь новости
│       └── +page.server.ts          # Server load (деталь)
├── service-worker.ts                # SW (cache-first для статики)
└── app.d.ts                         # SvelteKit types
```

---

## Stage 2: Рефакторинг и подготовка к масштабированию

> **Цель:** Подготовить архитектуру к интеграции БД, AI и новых источников.
> **Оценка трудозатрат:** 4–6 часов
> **Зависимости:** Нет

### P0 — Обязательно

#### 2.1 Рефакторинг news-service.ts — абстракция источников
- [ ] Создать интерфейс `NewsSource` в `src/lib/server/types.ts`:
  ```typescript
  interface NewsSource {
    name: string;
    type: 'rss' | 'api';
    fetch(fetchFn: typeof fetch): Promise<RawNewsItem[]>;
  }

  interface RawNewsItem {
    title: string;
    link: string;
    pubDate?: string;
    content?: string;
    contentSnippet?: string;
    enclosure?: { url: string };
    source: string;
  }
  ```
- [ ] Создать `src/lib/server/sources/rss-source.ts` — реализация `NewsSource` для RSS
- [ ] Создать `src/lib/server/sources/index.ts` — реестр источников (экспорт массива `NewsSource[]`)
- [ ] Рефакторить `news-service.ts` — использовать pipeline:
  ```
  sources.map(s => s.fetch()) → flatten → transform → filter → sort → cache
  ```
- [ ] Перенести `FEEDS` массив в `sources/rss-source.ts`
- [ ] Прогнать тесты: `npm run test && npm run check && npm run build`

**Файлы для изменения:**
- `src/lib/server/news-service.ts` (рефакторинг)
- `src/lib/server/types.ts` (новый, или расширить `src/lib/types.ts`)
- `src/lib/server/sources/rss-source.ts` (новый)
- `src/lib/server/sources/index.ts` (новый)

#### 2.2 Вынести конфигурацию в env-переменные
- [ ] Создать `.env.example` с описанием всех переменных
- [ ] Заменить хардкод в `news-service.ts`:
  - `RSS_TIMEOUT_MS` (сейчас 8000)
  - `CACHE_TTL_MS` (сейчас 5 * 60 * 1000)
  - `MAX_SNIPPET_LENGTH` (сейчас 200)
- [ ] Использовать `$env/static/private` или `$env/dynamic/private`
- [ ] Добавить `.env` в `.gitignore` (проверить что уже есть)

**Файлы для изменения:**
- `src/lib/server/news-service.ts`
- `.env.example` (новый)
- `.gitignore` (проверить)

#### 2.3 CSP-заголовки
- [ ] Создать `src/hooks.server.ts` (если не существует)
- [ ] Добавить Content-Security-Policy через `handle` hook:
  ```typescript
  // Минимальный CSP
  response.headers.set('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +  // unsafe-inline для theme script
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' https: data:; " +
    "font-src 'self'; " +
    "connect-src 'self'"
  );
  ```
- [ ] Проверить что тема и View Transitions работают с CSP

**Файлы для изменения:**
- `src/hooks.server.ts` (новый или модификация)

### P1 — Важно

#### 2.4 Sitemap.xml
- [ ] Создать `src/routes/sitemap.xml/+server.ts`
- [ ] Генерировать XML со всеми текущими URL (/  и /news/[id])
- [ ] Добавить ссылку на sitemap в `static/robots.txt`

**Файлы для изменения:**
- `src/routes/sitemap.xml/+server.ts` (новый)
- `static/robots.txt`

#### 2.5 Health-check endpoint
- [ ] Создать `src/routes/api/health/+server.ts`
- [ ] Возвращать JSON: `{ status: 'ok', timestamp, feedsCount, cacheAge }`
- [ ] В будущем добавить проверку БД

**Файлы для изменения:**
- `src/routes/api/health/+server.ts` (новый)

### P2 — Желательно

#### 2.6 Тесты для news-service.ts
- [ ] Создать `src/lib/server/news-service.test.ts`
- [ ] Мокать fetch для тестирования `fetchAllNews`
- [ ] Тестировать: успешный fetch, таймаут, пустой фид, кеширование

#### 2.7 Canonical URLs на главной
- [ ] Добавить `<link rel="canonical">` на главную страницу в `+page.svelte`

---

## Stage 3: База данных (PostgreSQL)

> **Цель:** Персистентное хранение новостей, отвязка от in-memory кеша.
> **Оценка трудозатрат:** 8–12 часов
> **Зависимости:** Stage 2 (абстракция источников)

### P0 — Обязательно

#### 3.1 Выбор и настройка ORM/клиента
- [ ] Установить `drizzle-orm` + `drizzle-kit` + `pg` (или `postgres`)
  ```bash
  npm install drizzle-orm pg
  npm install -D drizzle-kit @types/pg
  ```
- [ ] Создать `src/lib/server/db/index.ts` — подключение к PostgreSQL
- [ ] Создать `src/lib/server/db/schema.ts` — схема таблиц
- [ ] Создать `drizzle.config.ts` — конфигурация миграций
- [ ] Добавить env-переменные: `DATABASE_URL`

#### 3.2 Схема базы данных
- [ ] Таблица `feed_sources`:
  ```sql
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL UNIQUE,
  type VARCHAR(20) DEFAULT 'rss',  -- 'rss' | 'api' | 'reddit'
  language VARCHAR(10) DEFAULT 'ru',
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
  ```
- [ ] Таблица `articles`:
  ```sql
  id VARCHAR(100) PRIMARY KEY,  -- buildNewsId() hash
  source_id INTEGER REFERENCES feed_sources(id),
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  pub_date TIMESTAMP NOT NULL,
  content TEXT,
  content_snippet VARCHAR(500),
  image_url TEXT,
  language VARCHAR(10) DEFAULT 'en',
  -- поля для перевода (Stage 4)
  translated_title TEXT,
  translated_snippet TEXT,
  is_translated BOOLEAN DEFAULT false,
  -- мета
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
  ```
- [ ] Таблица `fetch_logs`:
  ```sql
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES feed_sources(id),
  fetched_at TIMESTAMP DEFAULT NOW(),
  items_count INTEGER DEFAULT 0,
  new_items_count INTEGER DEFAULT 0,
  error TEXT,
  duration_ms INTEGER
  ```

#### 3.3 Cron-сборщик (отвязка от пользовательских запросов)
- [ ] Создать `src/lib/server/jobs/feed-fetcher.ts`:
  - Импортировать все `NewsSource`-ы из Stage 2
  - Для каждого источника: fetch → parse → upsert в БД (INSERT ON CONFLICT DO NOTHING)
  - Логировать в `fetch_logs`
- [ ] Создать API-эндпоинт для триггера: `src/routes/api/cron/fetch/+server.ts`
  - Защитить секретным токеном (`CRON_SECRET` из env)
  - Вызывать `feedFetcher.run()`
- [ ] Для dev-режима: запускать по расписанию через `node-cron` или SvelteKit hooks

#### 3.4 Рефакторинг запросов данных
- [ ] Изменить `src/routes/+page.server.ts`:
  - Вместо `fetchAllNews(fetch)` → запрос к БД: `SELECT * FROM articles ORDER BY pub_date DESC LIMIT 50`
- [ ] Изменить `src/routes/news/[id]/+page.server.ts`:
  - Вместо `fetchAllNews` + поиск по массиву → `SELECT * FROM articles WHERE id = $1`
- [ ] Удалить in-memory кеш из `news-service.ts` (или оставить как fallback)

#### 3.5 Docker-compose для разработки
- [ ] Создать `docker-compose.dev.yml`:
  ```yaml
  services:
    postgres:
      image: postgres:16-alpine
      environment:
        POSTGRES_DB: technews
        POSTGRES_USER: technews
        POSTGRES_PASSWORD: dev_password
      ports:
        - "5432:5432"
      volumes:
        - pgdata:/var/lib/postgresql/data
  volumes:
    pgdata:
  ```
- [ ] Добавить скрипт миграции в `package.json`: `"db:push": "drizzle-kit push"`
- [ ] Обновить `README.md` с инструкциями по запуску

**Файлы для создания:**
- `src/lib/server/db/index.ts`
- `src/lib/server/db/schema.ts`
- `drizzle.config.ts`
- `src/lib/server/jobs/feed-fetcher.ts`
- `src/routes/api/cron/fetch/+server.ts`
- `docker-compose.dev.yml`

**Файлы для изменения:**
- `src/routes/+page.server.ts`
- `src/routes/news/[id]/+page.server.ts`
- `src/lib/server/news-service.ts`
- `package.json`
- `.env.example`

### P1 — Важно

#### 3.6 Миграция sitemap на БД
- [ ] Обновить `sitemap.xml/+server.ts` — генерировать из таблицы `articles`

#### 3.7 Пагинация
- [ ] Добавить пагинацию на главной (offset/limit или cursor-based)
- [ ] Реализовать infinite scroll или кнопку "Загрузить ещё"

---

## Stage 4: AI-обработка контента (перевод)

> **Цель:** Автоматический перевод EN→RU заголовков и сниппетов.
> **Оценка трудозатрат:** 6–10 часов
> **Зависимости:** Stage 3 (БД для хранения переводов)
> **КРИТИЧЕСКИЙ ДЕДЛАЙН:** 168-ФЗ вступает в силу 01.03.2026

### P0 — Обязательно

#### 4.1 Сервис перевода
- [ ] Создать `src/lib/server/services/translation-service.ts`:
  ```typescript
  interface TranslationService {
    translate(text: string, from: string, to: string): Promise<string>;
    translateBatch(texts: string[], from: string, to: string): Promise<string[]>;
  }
  ```
- [ ] Реализация #1: **Cloudflare Workers AI** (NLLB-200)
  - API: `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/meta/m2m100-1.2b`
  - Env: `CF_ACCOUNT_ID`, `CF_AI_TOKEN`
  - Бесплатно: 10,000 запросов/день
- [ ] Реализация #2 (fallback): **LibreTranslate** (self-hosted)
  - Env: `LIBRETRANSLATE_URL` (default: `http://localhost:5000`)
- [ ] Обработка ошибок: если перевод не удался — сохранять оригинал, логировать, ставить `is_translated = false`

#### 4.2 Интеграция перевода в pipeline
- [ ] В `feed-fetcher.ts` после сохранения статьи:
  - Если `language != 'ru'` и `is_translated == false`:
    - Перевести `title` → `translated_title`
    - Перевести `content_snippet` → `translated_snippet`
    - Обновить запись: `is_translated = true`
- [ ] Добавить rate-limiting: не более N переводов за цикл (чтобы не превысить лимит API)

#### 4.3 Отображение переводов в UI
- [ ] В `+page.server.ts`: возвращать `translated_title ?? title`, `translated_snippet ?? content_snippet`
- [ ] В `NewsCard.svelte`: показывать индикатор языка (🇷🇺/🇬🇧) если перевод доступен
- [ ] На детальной странице: кнопка "Показать оригинал" / "Показать перевод"

**Файлы для создания:**
- `src/lib/server/services/translation-service.ts`
- `src/lib/server/services/cf-translator.ts` (Cloudflare реализация)
- `src/lib/server/services/libre-translator.ts` (LibreTranslate реализация)

**Файлы для изменения:**
- `src/lib/server/jobs/feed-fetcher.ts`
- `src/lib/server/db/schema.ts` (поля уже заложены в Stage 3)
- `src/routes/+page.server.ts`
- `src/routes/news/[id]/+page.server.ts`
- `src/lib/components/NewsCard.svelte`
- `src/routes/news/[id]/+page.svelte`

### P1 — Важно

#### 4.4 Глоссарий технических терминов
- [ ] Создать `src/lib/server/services/glossary.ts` — словарь терминов, которые НЕ нужно переводить:
  - `JavaScript`, `TypeScript`, `React`, `Svelte`, `Kubernetes`, `Docker`, `API`, `CI/CD` и т.д.
- [ ] Подставлять в промпт перевода: "Сохрани следующие термины без перевода: ..."

#### 4.5 Тесты перевода
- [ ] Мокать API, тестировать: успешный перевод, ошибка API, batch, глоссарий

---

## Stage 5: Деплой (Docker + Production)

> **Цель:** Запустить проект в продакшене.
> **Оценка трудозатрат:** 4–8 часов
> **Зависимости:** Stage 3 (БД)

### P0 — Обязательно

#### 5.1 Dockerfile
- [ ] Создать `Dockerfile` (multi-stage):
  ```dockerfile
  # Stage 1: Dependencies
  FROM node:20-alpine AS deps
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --omit=dev

  # Stage 2: Build
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY . .
  COPY --from=deps /app/node_modules ./node_modules
  RUN npm run build

  # Stage 3: Runtime
  FROM node:20-alpine AS runner
  WORKDIR /app
  COPY --from=builder /app/build ./build
  COPY --from=deps /app/node_modules ./node_modules
  COPY package.json ./
  ENV NODE_ENV=production
  EXPOSE 3000
  CMD ["node", "build"]
  ```
- [ ] Создать `.dockerignore`
- [ ] Создать `docker-compose.yml` (production):
  ```yaml
  services:
    app:
      build: .
      ports: ["3000:3000"]
      env_file: .env
      depends_on: [postgres]
      restart: unless-stopped
    postgres:
      image: postgres:16-alpine
      volumes: [pgdata:/var/lib/postgresql/data]
      env_file: .env
      restart: unless-stopped
  volumes:
    pgdata:
  ```

#### 5.2 Sentry
- [ ] Установить `@sentry/sveltekit`
- [ ] Настроить в `hooks.server.ts` и `hooks.client.ts`
- [ ] Env: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`

#### 5.3 CI/CD (GitHub Actions)
- [ ] Создать `.github/workflows/ci.yml`:
  - Lint + Type check (`npm run check`)
  - Unit-тесты (`npm run test`)
  - Build (`npm run build`)
- [ ] Опционально: деплой по push в main

### P1 — Важно

#### 5.4 Настройка Yandex Cloud / VPS
- [ ] Выбрать хостинг (Yandex Cloud Compute / VPS)
- [ ] Настроить reverse proxy (Caddy/Nginx) с автоматическим HTTPS
- [ ] Настроить cron для `api/cron/fetch` (systemd timer или crontab)

---

## Stage 6: Дополнительные источники данных

> **Цель:** Расширить охват новостей.
> **Оценка трудозатрат:** 4–6 часов на каждый источник
> **Зависимости:** Stage 2 (абстракция NewsSource), Stage 3 (БД)

### 6.1 NewsData.io API
- [ ] Создать `src/lib/server/sources/newsdata-source.ts`
- [ ] Реализовать `NewsSource` интерфейс
- [ ] Env: `NEWSDATA_API_KEY`
- [ ] Бесплатный лимит: 200 кредитов/день
- [ ] Добавить в реестр источников

### 6.2 Reddit API (r/programming, r/linux, r/machinelearning)
- [ ] Создать `src/lib/server/sources/reddit-source.ts`
- [ ] OAuth2 авторизация (app-only)
- [ ] Env: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`
- [ ] Фильтровать по score > N для качества

### 6.3 GitHub Trending
- [ ] Создать `src/lib/server/sources/github-source.ts`
- [ ] Использовать неофициальный API или scraping `github.com/trending`
- [ ] Отображать как отдельную категорию "Trending repos"

---

## Stage 7: AI-суммаризация (Gemini 1.5 Flash)

> **Цель:** Краткие саммари для длинных статей.
> **Оценка трудозатрат:** 6–10 часов
> **Зависимости:** Stage 3 (БД), Stage 4 (перевод)

### 7.1 Сервис суммаризации
- [ ] Создать `src/lib/server/services/summarization-service.ts`
- [ ] Интеграция с Google Gemini 1.5 Flash API
- [ ] Env: `GEMINI_API_KEY`
- [ ] Промпт: "Суммаризируй технологическую новость в 2-3 предложения на русском языке. Сохрани технические термины."

### 7.2 Схема БД
- [ ] Добавить поля в `articles`:
  ```sql
  summary TEXT,
  is_summarized BOOLEAN DEFAULT false,
  summary_model VARCHAR(50)
  ```

### 7.3 UI
- [ ] На карточке: показывать summary вместо snippet (если доступен)
- [ ] На детальной: раскрываемый блок "AI-саммари"

---

## Stage 8: Дедупликация через эмбеддинги

> **Цель:** Объединение одинаковых новостей из разных источников.
> **Оценка трудозатрат:** 8–12 часов
> **Зависимости:** Stage 3 (PostgreSQL), Stage 7 (текст для сравнения)

### 8.1 pgvector
- [ ] Установить расширение `pgvector` в PostgreSQL
- [ ] Добавить поле `embedding VECTOR(384)` в `articles`
- [ ] Индекс: `CREATE INDEX ON articles USING ivfflat (embedding vector_cosine_ops)`

### 8.2 Генерация эмбеддингов
- [ ] Использовать Cloudflare Workers AI (модель `@cf/baai/bge-small-en-v1.5`) или sentence-transformers
- [ ] При сохранении статьи — генерировать embedding из `title + snippet`

### 8.3 Кластеризация
- [ ] При вставке новой статьи:
  ```sql
  SELECT id, title, 1 - (embedding <=> $1) AS similarity
  FROM articles
  WHERE pub_date > NOW() - INTERVAL '48 hours'
  AND 1 - (embedding <=> $1) > 0.92
  ORDER BY similarity DESC
  LIMIT 5
  ```
- [ ] Если найден похожий кластер → привязать к нему, показывать только "главный" источник
- [ ] UI: "Также пишут: [источник1], [источник2]"

---

## Stage 9: Пользователи и персонализация

> **Цель:** Личный кабинет, закладки, персональная лента.
> **Зависимости:** Stage 3 (БД), Stage 5 (продакшен)

### 9.1 Аутентификация
- [ ] Supabase Auth (или собственная реализация с JWT)
- [ ] Стратегии: Email/Password, GitHub OAuth, Google OAuth
- [ ] 152-ФЗ: хранение ПД в РФ → PostgreSQL на российском сервере

### 9.2 Таблицы
- [ ] `users` (id, email, name, avatar, created_at)
- [ ] `bookmarks` (user_id, article_id, created_at)
- [ ] `user_preferences` (user_id, preferred_sources, preferred_categories, language)
- [ ] `read_history` (user_id, article_id, read_at)

### 9.3 Персонализация
- [ ] Алгоритм "Для вас" на основе:
  - Истории чтения
  - Закладок
  - Предпочтений по источникам
- [ ] Реализовать через pgvector: рекомендации на основе сходства эмбеддингов прочитанных статей

---

## Stage 10: PWA 2.0 и мобильная оптимизация

> **Цель:** Полноценный офлайн-режим, push-уведомления.
> **Зависимости:** Stage 5 (продакшен), Stage 9 (пользователи для push)

### 10.1 Офлайн-режим
- [ ] Обновить `service-worker.ts`:
  - Network-First для HTML-страниц
  - Stale-While-Revalidate для API-ответов
  - Offline fallback page (`/offline`)
- [ ] IndexedDB для кеширования статей на клиенте

### 10.2 Push-уведомления
- [ ] Web Push API + VAPID ключи
- [ ] Таблица `push_subscriptions` (user_id, endpoint, keys, created_at)
- [ ] Отправка при появлении "горячей" новости (score > порога)
- [ ] Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

### 10.3 Background Sync
- [ ] Синхронизация закладок и прочитанного при восстановлении связи

---

## Stage 11: E2E тесты (Playwright)

> **Цель:** Автоматизация тестирования пользовательских сценариев.
> **Можно начать параллельно с любым этапом после Stage 2**

### 11.1 Настройка
- [ ] Установить Playwright: `npm init playwright@latest`
- [ ] Создать `playwright.config.ts`
- [ ] Добавить в CI pipeline

### 11.2 Сценарии
- [ ] Загрузка главной страницы, отображение карточек
- [ ] Переход на детальную страницу
- [ ] Переключение темы (dark/light)
- [ ] Мобильный вид (responsive)
- [ ] SEO проверки (meta-теги, Schema.org)
- [ ] Проверка PWA (manifest, SW)

---

## Stage 12: Мониторинг и наблюдаемость

> **Цель:** Production-grade мониторинг.
> **Зависимости:** Stage 5 (продакшен)

### 12.1 Sentry (ошибки)
- [ ] Уже установлен в Stage 5
- [ ] Настроить source maps upload
- [ ] Алерты в Telegram/Email

### 12.2 Аналитика
- [ ] Простая внутренняя аналитика (или Plausible/Umami — privacy-friendly)
- [ ] Метрики: просмотры, клики, источники трафика

### 12.3 Мониторинг инфраструктуры
- [ ] Uptime monitoring (Better Stack / UptimeRobot)
- [ ] Health-check endpoint мониторинг
- [ ] Алерт если cron-сборщик не работает > 30 минут

---

## Поздние этапы (V2)

### Stage 13: Микросервисы
- Разделение на: Ingestion, Intelligence (AI), API, Frontend
- Docker Compose → Kubernetes (KEDA для автоскалирования)
- Redis для очередей между сервисами

### Stage 14: Flutter мобильное приложение
- Переписать UI на Dart/Flutter
- Нативные push-уведомления
- Публикация в Google Play / App Store

### Stage 15: Монетизация
- Freemium модель ($5/мес для Pro)
- B2B API (доступ к очищенной ленте)
- Спонсированный контент

---

## Матрица зависимостей этапов

```
Stage 2 (Рефакторинг) ──────┬──→ Stage 3 (БД) ──────┬──→ Stage 4 (Перевод)
                             │                        ├──→ Stage 6 (Источники)
                             │                        ├──→ Stage 7 (Суммаризация)
                             │                        └──→ Stage 8 (Дедупликация)
                             │
                             └──→ Stage 5 (Деплой) ──→ Stage 9 (Пользователи)
                                                      ├──→ Stage 10 (PWA 2.0)
                                                      └──→ Stage 12 (Мониторинг)

Stage 11 (E2E тесты) — параллельно с любым после Stage 2
```

---

## Правила для AI-агентов

1. **Проверки после каждого изменения:**
   ```bash
   npm run check && npm run build && npm run test
   ```
2. **Коммиты:** Использовать префиксы `feat:`, `fix:`, `refactor:`, `test:`, `chore:`
3. **Не ломать существующее:** Каждый этап должен сохранять работоспособность приложения
4. **Обновлять документацию:** После завершения этапа обновить `AI_MEMORY.md` и отметить `[x]` в этом файле
5. **Не пропускать этапы:** Зависимости обязательны (см. матрицу выше)
6. **Язык:** Код на английском, UI/комментарии/документация на русском
7. **Svelte 5 Runes:** Использовать `$state`, `$derived`, `$effect` вместо stores
8. **TypeScript strict:** Никаких `any`, полная типизация
