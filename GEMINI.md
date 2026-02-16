# Инструкции для Gemini CLI — News Aggregator

## О проекте
Интеллектуальный агрегатор технологических новостей (программирование, AI, ОС).
Стек: SvelteKit 5 (Runes) + TypeScript + TailwindCSS.
Язык интерфейса: русский (`lang="ru"`).

## Обязательный контекст — читать перед любой задачей
Перед началом работы **всегда** прочитай эти файлы (в указанном порядке):

1. `AI_MEMORY.md` — текущий этап, прогресс, последние решения
2. `ROADMAP.md` — план развития (Stage 5-12)
3. `ARCHITECTURE.md` — текущий стек и архитектура
4. `MINOR_ISSUES.md` — backlog мелких рекомендаций
5. Последний файл в `ai_code_reviews/` — актуальные замечания

**Не начинай писать код, пока не прочитал `AI_MEMORY.md` и `ROADMAP.md`.**

**Не читать:** `docs/archive/*` — устаревшие документы

## Ключевые правила
- Всегда отвечай на русском языке
- Код на английском, UI и документация на русском
- Svelte 5 Runes (`$state`, `$derived`, `$effect`) — не используй stores
- TypeScript strict — никаких `any`, полная типизация
- Не вноси изменения в код без явной просьбы

## Архитектура проекта
```
src/
├── lib/
│   ├── types.ts                  # Типы (NewsItem)
│   ├── server/
│   │   ├── config.ts             # Env-переменные
│   │   ├── db/                   # PostgreSQL + Drizzle
│   │   ├── sources/              # RSS источники
│   │   ├── services/             # AI-перевод
│   │   ├── jobs/                 # Cron-сборщик
│   │   └── news-utils.ts         # Утилиты
│   └── components/
│       ├── NewsCard.svelte       # Карточка новости
│       ├── MasonryGrid.svelte    # Grid layout
│       └── ThemeToggle.svelte    # Dark/Light переключатель
└── routes/
    ├── +page.svelte              # Главная (лента)
    ├── +page.server.ts           # Server load
    ├── +layout.svelte            # Layout (Schema.org)
    ├── +error.svelte             # Error page
    ├── api/                      # API endpoints
    ├── sitemap.xml/+server.ts    # Dynamic sitemap
    └── robots.txt/+server.ts     # Dynamic robots.txt
```

**Важно:** Детальной страницы `/news/[id]` больше нет — карточки ведут напрямую на источник.

## Режимы работы

### Режим "Реализация" (переходим к следующему этапу)
1. Определи текущий этап из `AI_MEMORY.md`
2. Открой `ROADMAP.md` → найди следующий Stage
3. Выполняй задачи по приоритету P0 → P1 → P2
4. После каждого блока: `npm run check && npm run build && npm run test:run`
5. Отметь `[x]` в `ROADMAP.md`, обнови `AI_MEMORY.md`

### Режим "Исправь ревью"
1. Прочитай последнее ревью из `ai_code_reviews/`
2. Выпиши задачи: P0 → P1 → P2
3. Критически оцени — ревьюер мог ошибаться
4. Исправь, прогони проверки, верни отчёт

### Режим "Что-то поправить" (без деталей)
1. Проверь `MINOR_ISSUES.md` и последний review
2. Исправь самое критичное
3. Спроси, если несколько равнозначных вариантов

## Технический чеклист
- **Безопасность:** санитизация контента, таймауты, CSP, `noopener noreferrer`
- **SEO:** title, description, OG-теги, JSON-LD, sitemap.xml
- **A11y:** `lang="ru"`, skip-link, семантическая разметка
- **PWA:** manifest, service-worker, offline fallback
- **SvelteKit:** server-side load, setHeaders, Runes API

## Команды проверки
```bash
npm run check && npm run build && npm run test:run
```

## Формат коммитов
- `feat:` — новая функциональность
- `fix:` — исправление
- `refactor:` — рефакторинг
- `test:` — тесты
- `chore:` — конфигурация

## Ограничения
- Не откатывать чужие изменения без команды
- Не использовать destructive git-команды
- При конфликтах — остановиться и спросить
- Всегда на русском

---

**Обновлено:** 16.02.2026 (после Stage 7 Overhaul)
