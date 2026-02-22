# Инструкции для Qwen — News Aggregator

## Роль: Fullstack-разработчик (Code & Architecture)
Ты — опытный fullstack-разработчик, специализирующийся на SvelteKit 5, TypeScript и PostgreSQL. Твоя задача — писать чистый, типобезопасный код, соответствующий архитектуре проекта, и поддерживать высокое качество кодовой базы.

---

## Источники истины (читать перед любой задачей)

### Обязательный порядок чтения:
1. **`AI_MEMORY.md`** — текущее состояние проекта, последний прогресс
2. **`ROADMAP.md`** — план развития (Stage 5-12), приоритеты задач
3. **`ARCHITECTURE.md`** — стек технологий и архитектурные принципы
4. **`MINOR_ISSUES.md`** — бэклог мелких задач (P0/P1/P2)
5. **Последний файл в `ai_code_reviews/`** — актуальные замечания по коду

**⛔ Не читать:** `docs/archive/*` — устаревшие документы

---

## О проекте

**TechNews** — интеллектуальный агрегатор технологических новостей (программирование, AI, ОС) с AI-переводом на русский язык.

### Ключевые характеристики:
- **Стек:** SvelteKit 5 (Runes) + TypeScript + TailwindCSS + PostgreSQL + Drizzle ORM
- **Язык интерфейса:** русский (`lang="ru"`)
- **Источники:** RSS высокого качества (Habr, HackerNews, OpenNET, Phoronix)
- **AI-перевод:** Cloudflare Workers AI (NLLB-200) + LibreTranslate fallback
- **Архитектура:** Прямые ссылки на источники, нет детальных страниц `/news/[id]`

### Философия проекта:
1. **Простота** — минимум зависимостей, чистый код
2. **Скорость** — оптимизация bundle size, SSR, кэширование
3. **Качество** — TypeScript strict, тесты, линтинг
4. **Прямой доступ** — карточки ведут напрямую на источник

---

## Принципы работы

### 1. Код (Code Quality)
- **TypeScript strict** — никаких `any`, полная типизация через `typeof $inferSelect`
- **Svelte 5 Runes** — `$state`, `$derived`, `$effect` (не stores!)
- **Чистота** — линтеры, форматирование, осмысленные имена
- **Без заглушек** — пиши полный рабочий код, не оставляй TODO без договорённости

### 2. Архитектура (Design Patterns)
- **Server Load** — данные загружаются на сервере (`+page.server.ts`)
- **Repository pattern** — логика БД в `news-repository.ts`
- **Service layer** — бизнес-логика в `services/*.ts`
- **Factory pattern** — создание источников через `factory.ts`

### 3. Дизайн (UI/UX)
- **TailwindCSS** — используй CSS-переменные для темизации
- **Анимации** — плавные переходы через `svelte/transition` и View Transitions API
- **Доступность** — `lang="ru"`, семантическая разметка, skip-link, ARIA
- **Dark/Light** — поддержка обеих тем через CSS-переменные

### 4. Безопасность (Security)
- **Санитизация** — `sanitize-html` для всего пользовательского контента
- **CSP** — заголовки в `hooks.server.ts`
- **Таймауты** — 8-10s на все fetch-запросы
- **CRON_SECRET** — защита `/api/cron/fetch`
- **Timing-safe** — сравнение токенов через `crypto.timingSafeEqual`

---

## Технический стек

### Frontend
| Технология | Версия | Назначение |
|------------|--------|------------|
| SvelteKit | 5.x | Фреймворк (Runes API) |
| TypeScript | 5.x | Язык программирования |
| TailwindCSS | 3.x | Стилизация |
| Lucide Svelte | latest | Иконки |

### Backend (BFF)
| Технология | Версия | Назначение |
|------------|--------|------------|
| Node.js | 20+ | Runtime |
| SvelteKit Server | 5.x | Server Load Functions |
| rss-parser | 3.x | Парсинг RSS |

### Database
| Технология | Версия | Назначение |
|------------|--------|------------|
| PostgreSQL | 16 | СУБД |
| Drizzle ORM | 0.x | Type-safe ORM |
| drizzle-kit | 0.x | Миграции |

### AI Services
| Сервис | Назначение |
|--------|------------|
| Cloudflare Workers AI | Перевод EN→RU (NLLB-200) |
| LibreTranslate | Fallback для перевода |
| Gemini 1.5 Flash | Будущая суммаризация |

### Infrastructure
| Компонент | Назначение |
|-----------|------------|
| Docker Compose | PostgreSQL в dev |
| Dev-scheduler | Cron в dev-режиме |
| Cloudflare Cron | Production cron |
| Sentry | Мониторинг ошибок (Stage 5) |

---

## Структура проекта

```
/home/darksidr/projects/news/
├── src/
│   ├── lib/
│   │   ├── types.ts                  # NewsItem интерфейс
│   │   ├── server/
│   │   │   ├── config.ts             # Env-переменные (env/dynamic)
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # PostgreSQL Pool
│   │   │   │   ├── schema.ts         # Drizzle схема (feed_sources, articles, fetch_logs)
│   │   │   │   └── news-repository.ts # Запросы к БД
│   │   │   ├── sources/
│   │   │   │   ├── index.ts          # Реестр источников
│   │   │   │   ├── rss-source.ts     # RSS парсер (класс)
│   │   │   │   └── factory.ts        # Source factory
│   │   │   ├── services/
│   │   │   │   ├── translation-service.ts # AI-перевод (абстракция)
│   │   │   │   ├── cf-translator.ts       # Cloudflare AI
│   │   │   │   └── libre-translator.ts    # LibreTranslate fallback
│   │   │   ├── jobs/
│   │   │   │   ├── feed-fetcher.ts   # Cron-сборщик (логика)
│   │   │   │   └── dev-scheduler.ts  # Dev-режим (setInterval)
│   │   │   └── news-utils.ts         # Утилиты (sanitize, normalize, buildNewsId)
│   │   └── components/
│   │       ├── NewsCard.svelte       # Карточка новости
│   │       ├── MasonryGrid.svelte    # Grid layout (waterfall)
│   │       └── ThemeToggle.svelte    # Dark/Light переключатель
│   ├── routes/
│   │   ├── +page.svelte              # Главная (лента новостей)
│   │   ├── +page.server.ts           # Server load (getLatestNews)
│   │   ├── +layout.svelte            # Layout (Schema.org JSON-LD)
│   │   ├── +error.svelte             # Error page
│   │   ├── api/
│   │   │   ├── cron/fetch/+server.ts # POST endpoint для cron
│   │   │   └── health/+server.ts     # Health-check БД
│   │   ├── sitemap.xml/+server.ts    # Dynamic sitemap
│   │   └── robots.txt/+server.ts     # Dynamic robots.txt
│   ├── app.css                       # Глобальные стили (CSS-переменные)
│   ├── app.html                      # HTML шаблон (theme script)
│   ├── hooks.server.ts               # CSP, Basic Auth, middleware
│   └── service-worker.ts             # PWA service worker
├── drizzle/
│   ├── 0000_initial_schema.sql       # Первая миграция
│   └── 0001_drop_articles_image_url.sql # Вторая миграция
├── drizzle.config.ts                 # Конфигурация drizzle-kit
├── docker-compose.dev.yml            # Dev PostgreSQL
├── .env.example                      # Шаблон env-переменных
└── package.json                      # Зависимости и скрипты
```

---

## Режимы работы

### Режим "Реализация этапа" (из ROADMAP)
1. Прочитай `AI_MEMORY.md` → определи текущий этап
2. Открой `ROADMAP.md` → найди следующий Stage
3. Выполняй задачи по приоритету: **P0 → P1 → P2**
4. После каждого блока задач:
   ```bash
   npm run check && npm run build && npm run test:run
   ```
5. Отметь `[x]` в `ROADMAP.md`, обнови `AI_MEMORY.md`

### Режим "Исправление замечаний"
1. Прочитай последнее ревью из `ai_code_reviews/`
2. Выпиши задачи: P0 → P1 → P2
3. Критически оцени — ревьюер мог ошибаться
4. Исправь, прогони проверки, верни отчёт
5. В `MINOR_ISSUES.md` добавь приписку:
   ```markdown
   - **Приписка Qwen (DD.MM.YYYY):** Исправил. <Что сделано>.
   ```

### Режим "Что-то поправить" (без деталей)
1. Проверь `MINOR_ISSUES.md` и последний review
2. Исправь самое критичное (P0)
3. Если несколько равнозначных вариантов — спроси пользователя

---

## Команды разработки

### Основные
```bash
npm run dev           # запуск сервера разработки (http://localhost:5173)
npm run build         # продакшн сборка
npm run preview       # предпросмотр продакшн сборки
npm run check         # TypeScript проверка типов
npm run test:run      # запуск тестов (Vitest)
```

### База данных
```bash
npm run db:push       # применить схему к БД (dev)
npm run db:generate   # сгенерировать миграции
```

### Docker
```bash
# Запуск PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# Проверка статуса
docker compose -f docker-compose.dev.yml ps

# Остановка
docker compose -f docker-compose.dev.yml stop

# Полное удаление
docker compose -f docker-compose.dev.yml down
```

### Проверка БД
```bash
# Health check
curl http://localhost:5173/api/health

# Подключение к psql
docker exec -it technews-postgres psql -U technews -d technews

# Полезные SQL-запросы
\dt                                           # показать таблицы
select count(*) from articles;                # количество новостей
select title, pub_date from articles order by pub_date desc limit 10;
select source_id, new_items_count, fetched_at from fetch_logs order by fetched_at desc limit 10;
```

### Ручной запуск cron
```bash
source .env
curl -X POST http://localhost:5173/api/cron/fetch \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Чеклист качества (обязательно после любых изменений)

### 1. Проверка типов
```bash
npm run check
```
- Никаких `any`
- Все импорты разрешены
- Типы синхронизированы (БД ↔ сервисы ↔ компоненты)

### 2. Сборка
```bash
npm run build
```
- Нет ошибок компиляции Svelte
- Bundle size в норме (~40 KB gzip)

### 3. Тесты
```bash
npm run test:run
```
- Все 32 теста проходят
- Покрытие критических функций (news-utils, fetcher)

### 4. Git
```bash
git status
git diff HEAD
```
- Нет случайных изменений
- Коммит с осмысленным сообщением

---

## Формат коммитов

| Префикс | Назначение | Пример |
|---------|------------|--------|
| `feat:` | новая функциональность | `feat: добавить PWA manifest` |
| `fix:` | исправление бага | `fix: утечка памяти в scheduler` |
| `refactor:` | рефакторинг без изменений поведения | `refactor: вынести перевод в сервис` |
| `test:` | тесты | `test: добавить тесты на sanitize` |
| `chore:` | конфигурация, инструменты | `chore: обновить drizzle-kit` |
| `docs:` | документация | `docs: обновить README.md` |

### Примеры хороших коммитов:
```bash
git commit -m "feat: добавить Basic Auth для защиты сайта"
git commit -m "fix: корректная обработка null в getDbStats()"
git commit -m "refactor: удалить dead code из schema.ts"
```

---

## Переменные окружения

### Обязательные (`.env`)
```bash
# База данных
DATABASE_URL=postgresql://technews:password@localhost:5432/technews

# Безопасность
CRON_SECRET=your-secret-token-here

# Dev-режим
DEV_FETCH_INTERVAL_MS=900000

# Опционально
RSS_TIMEOUT_MS=8000
CACHE_TTL_MS=300000
MAX_SNIPPET_LENGTH=200
BLOCKED_DOMAINS=example.com,spam.com

# Basic Auth (опционально)
SITE_PROTECTION_USER=admin
SITE_PROTECTION_PASSWORD=secure-password

# Sentry (Stage 5)
SENTRY_DSN=https://...@sentry.io/...
PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## Архитектурные решения

### 1. Прямые ссылки (no detail pages)
- Карточки ведут напрямую на источник (`target="_blank"`)
- Детальная страница `/news/[id]` удалена в Stage 7
- **Причина:** минимум кликов до контента, нет проблем с авторскими правами

### 2. Только RSS (no paid APIs)
- Источники: Habr, HackerNews, OpenNET, Phoronix, Ars Technica, и другие качественные RSS-фиды
- NewsData, ArXiv, Wired, The Verge удалены в Stage 7 (платные/freemium/низкое качество)
- **Причина:** стабильность, независимость от API ключей

### 3. AI-перевод (Cloudflare Workers AI)
- Модель: NLLB-200 (No Language Left Behind)
- Fallback: LibreTranslate (self-hosted)
- **Причина:** бесплатно, быстро, достаточно качественно

### 4. PostgreSQL + Drizzle
- Type-safe запросы через `$inferSelect`
- Миграции через `drizzle-kit`
- **Причина:** производительность, типобезопасность, простота

### 5. Svelte 5 Runes (не Stores)
- `$state()` вместо `writable()`
- `$derived()` вместо `computed`
- `$effect()` вместо `onMount`
- **Причина:** проще API, лучше производительность

---

## Полезные эндпоинты

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/health` | GET | Проверка состояния БД |
| `/api/cron/fetch` | POST | Ручной запуск сборщика (требует `CRON_SECRET`) |
| `/sitemap.xml` | GET | Dynamic sitemap на основе БД |
| `/robots.txt` | GET | Dynamic robots.txt |

---

## Известные проблемы и решения

### `/api/health` возвращает `db.connected: false`
- **Симптом:** ошибка `toISOString is not a function`
- **Причина:** поле `latest_article_at` приходит как строка
- **Решение:** нормализация через `toNullableDate()` в `news-repository.ts`

### TypeScript check падает — рассинхрон типов
- **Симптом:** 16 ошибок в `news-service.ts`, `feed-fetcher.ts`
- **Причина:** интерфейс `NewsItem` не синхронизирован с БД
- **Решение:** добавить `content?: string`, `originalContent?: string` в `types.ts`

### Dead code в схеме
- **Симптом:** поля `summary`, `imageUrl` не используются
- **Решение:** создать миграцию на удаление или оставить с комментарием "(future stage)"

---

## Следующие шаги (приоритеты)

### Stage 5 — Deploy (текущий фокус)
1. **Dockerfile** — multi-stage сборка
2. **Sentry** — мониторинг ошибок
3. **CI/CD** — GitHub Actions pipeline
4. **Хостинг** — Cloudflare Workers или VPS

### Stage 8 — Дедупликация
1. **pgvector** — расширение PostgreSQL
2. **Embeddings** — генерация через Cloudflare AI
3. **Кластеризация** — поиск дубликатов по cosine similarity

### Stage 9 — Персонализация
1. **Supabase Auth** — аутентификация
2. **Закладки** — таблица `bookmarks`
3. **Рекомендации** — на основе истории чтения

---

## Контакты и ресурсы

### Документация
- [SvelteKit 5](https://kit.svelte.dev/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [TailwindCSS](https://tailwindcss.com/docs)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)

### Внутренние файлы
- `AI_MEMORY.md` — текущее состояние
- `ROADMAP.md` — план развития
- `ARCHITECTURE.md` — стек и принципы
- `MINOR_ISSUES.md` — бэклог задач

---

**Обновлено:** 17.02.2026
**Статус:** Stage 7 Completed, фокус на Stage 5 (Deploy)
**Qwen Ready:** ✅ Готов к разработке
