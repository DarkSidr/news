# Architecture — Tech Stack & Principles

> **Обновлено:** 16.02.2026
> **Философия:** Простота, скорость, минимум зависимостей

---

## Tech Stack

### Frontend
- **Framework**: SvelteKit 5 (Runes API)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS + CSS Variables
- **PWA**: Service Worker + Manifest

### Backend (BFF)
- **Runtime**: Node.js 20+
- **Server**: SvelteKit Server Functions
- **RSS Parser**: `rss-parser` (с таймаутами)

### Database
- **СУБД**: PostgreSQL 16
- **ORM**: Drizzle ORM + drizzle-kit
- **Tables**: `feed_sources`, `articles`, `fetch_logs`

### AI Services
- **Translation**: Cloudflare Workers AI (NLLB-200)
- **Fallback**: LibreTranslate (self-hosted)
- **Future**: Gemini 1.5 Flash (суммаризация)

### Infrastructure
- **Dev**: Docker Compose (PostgreSQL)
- **Cron**: Dev-scheduler (setInterval) → Production: Cloudflare Cron Triggers
- **Monitoring**: Future: Sentry

---

## Architecture Diagram

```
┌─────────────┐
│   Browser   │ ← Dark/Light Theme, Masonry Grid
└──────┬──────┘
       │ HTTPS
┌──────▼──────┐
│  SvelteKit  │ ← SSR, Runes API
│  (Frontend) │
└──────┬──────┘
       │
┌──────▼──────┐
│  SvelteKit  │ ← Server Load Functions
│  (Backend)  │
└──┬────┬─────┘
   │    │
   │    └──────────┐
   │               │
┌──▼──────┐  ┌────▼─────────┐
│   RSS   │  │  PostgreSQL  │
│ Sources │  │   (Drizzle)  │
└─────────┘  └──────────────┘
                     │
              ┌──────▼─────────┐
              │  Cron Fetcher  │
              │ (every 15 min) │
              └────────┬───────┘
                       │
              ┌────────▼───────────┐
              │ Cloudflare AI      │
              │ (Translation EN→RU)│
              └────────────────────┘
```

---

## Key Principles

### 1. Прямые ссылки
- Карточки ведут напрямую на источник (`target="_blank"`)
- Нет детальных страниц (`/news/[id]` удалён)
- Минимум кликов до контента

### 2. Только бесплатные источники
- RSS высокого качества (HackerNews, Habr, Phoronix)
- Нет платных API (NewsData, ArXiv удалены)
- Self-hosted альтернативы (LibreTranslate)

### 3. Чистый дизайн
- Нет изображений в карточках
- Фокус на тексте и скорости
- Dark/Light режимы

### 4. TypeScript Strict
- Никаких `any`
- Полная типизация
- Drizzle type-safe queries

### 5. Svelte 5 Runes (не Stores)
- `$state` вместо `writable`
- `$derived` вместо computed
- `$effect` вместо `onMount`

---

## File Structure

```
src/
├── lib/
│   ├── types.ts                  # NewsItem интерфейс
│   ├── server/
│   │   ├── config.ts             # Env-переменные
│   │   ├── db/
│   │   │   ├── index.ts          # PostgreSQL Pool
│   │   │   ├── schema.ts         # Drizzle схема
│   │   │   └── news-repository.ts # Запросы к БД
│   │   ├── sources/
│   │   │   ├── index.ts          # Реестр источников
│   │   │   ├── rss-source.ts     # RSS парсер
│   │   │   └── factory.ts        # Source factory
│   │   ├── services/
│   │   │   ├── translation-service.ts # AI-перевод
│   │   │   ├── cf-translator.ts       # Cloudflare AI
│   │   │   └── libre-translator.ts    # LibreTranslate
│   │   ├── jobs/
│   │   │   ├── feed-fetcher.ts   # Cron-сборщик
│   │   │   └── dev-scheduler.ts  # Dev-режим
│   │   └── news-utils.ts         # Утилиты (sanitize, normalize)
│   └── components/
│       ├── NewsCard.svelte       # Карточка новости
│       ├── MasonryGrid.svelte    # Grid layout
│       └── ThemeToggle.svelte    # Dark/Light переключатель
└── routes/
    ├── +page.svelte              # Главная (лента)
    ├── +page.server.ts           # Server load
    ├── +layout.svelte            # Layout (Schema.org)
    ├── +error.svelte             # Error page
    ├── api/
    │   ├── cron/fetch/+server.ts # Cron endpoint
    │   └── health/+server.ts     # Health-check
    ├── sitemap.xml/+server.ts    # Dynamic sitemap
    └── robots.txt/+server.ts     # Dynamic robots.txt
```

---

## Performance

- **Bundle size**: ~40 KB (gzip) — SvelteKit компилирует в чистый JS
- **TTI**: < 1.2s на мобильных (3G)
- **Lighthouse**: 90+ (Performance, SEO, A11y)

---

## Security

- ✅ Санитизация HTML (`sanitize-html`)
- ✅ CSP заголовки (`hooks.server.ts`)
- ✅ Таймауты на fetch (8-10s)
- ✅ CRON_SECRET для защиты `/api/cron/fetch`
- ✅ Timing-safe сравнение токенов

---

## Next Steps

1. **Deploy**: Docker + Cloudflare Workers
2. **Dedup**: pgvector для поиска дубликатов
3. **Personalization**: Supabase Auth + рекомендации

---

**Для деталей:** см. `ROADMAP.md`
