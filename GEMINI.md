# Инструкции для Gemini CLI — News Aggregator

## О проекте
Интеллектуальный агрегатор технологических новостей (программирование, AI, ОС).
Стек: SvelteKit 5 (Runes) + TypeScript + TailwindCSS.
Язык интерфейса: русский (`lang="ru"`).

## Обязательный контекст — читать перед любой задачей
Перед началом работы **всегда** прочитай эти файлы (в указанном порядке):

1. `AI_MEMORY.md` — текущий этап, прогресс, последние решения
2. `ROADMAP.md` — **детальный поэтапный план** (Stage 2–12) с задачами, файлами, SQL-схемами, зависимостями. Это главный рабочий документ
3. `TECHNICAL_PLAN.md` — целевая архитектура и стратегические требования
4. `MINOR_ISSUES.md` — backlog мелких рекомендаций (P2+)
5. Последний файл в `ai_code_reviews/` — актуальные замечания

**Не начинай писать код, пока не прочитал `AI_MEMORY.md` и `ROADMAP.md`.**

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
│   ├── types.ts                    # Типы (NewsItem и др.)
│   ├── server/
│   │   ├── news-service.ts         # Основной сервис (fetch + cache + parse)
│   │   ├── news-utils.ts           # Утилиты (strip, normalize, extract)
│   │   └── news-utils.test.ts      # Unit-тесты (Vitest)
│   └── components/
│       ├── NewsCard.svelte          # Карточка новости
│       ├── MasonryGrid.svelte       # Masonry layout
│       └── ThemeToggle.svelte       # Переключатель темы
├── routes/
│   ├── +page.svelte                 # Главная (лента)
│   ├── +page.server.ts              # Server load
│   ├── +layout.svelte               # Layout (Schema.org, meta)
│   ├── +error.svelte                # Error page
│   └── news/[id]/                   # Деталь новости
├── service-worker.ts                # PWA Service Worker
└── app.d.ts                         # SvelteKit types
```

## Режимы работы

### Режим "Реализация" (переходим к следующему этапу)
1. Определи текущий этап из `AI_MEMORY.md`
2. Открой `ROADMAP.md` → найди следующий Stage
3. Учти зависимости (матрица в конце ROADMAP.md)
4. Выполняй задачи по приоритету P0 → P1 → P2
5. После каждого блока: `npm run check && npm run build && npm run test`
6. Отметь `[x]` в `ROADMAP.md`, обнови `AI_MEMORY.md`

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
npm run check && npm run build && npm run test
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
