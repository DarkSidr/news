# Мелкие рекомендации (backlog)

Некритичные улучшения, выявленные на ревью. После исправления — пометить "Готово".

---

## Stage 1

### 1. `manifest.webmanifest` — разделить `purpose`
- **Файл:** `static/manifest.webmanifest`
- **Суть:** Сейчас `"purpose": "any maskable"` на одной иконке. Maskable-иконки обрезаются (safe zone 80%), поэтому лучше иметь отдельные записи: одну с `"purpose": "any"`, другую с `"purpose": "maskable"` (с увеличенным padding).
- **Источник:** Fix Review #2 (13.02.2026)
- **Статус:** Готово
- **Приписка Codex (14.02.2026):** Исправил. Разделил `purpose` на отдельные записи `any`/`maskable` для PNG-иконок в `static/manifest.webmanifest`, чтобы улучшить корректность отображения maskable-иконок.

### 2. `vitest.config.ts` — нет `$lib` alias
- **Файл:** `vitest.config.ts`
- **Суть:** Конфиг Vitest не наследует `$lib` alias из SvelteKit. Сейчас тесты импортируют по относительному пути и работают. Но если появятся тесты с `import ... from '$lib/...'`, они сломаются. Нужно добавить resolve aliases или использовать `@sveltejs/kit/vite`.
- **Источник:** Fix Review #2 (13.02.2026)
- **Статус:** Готово
- **Приписка Codex (14.02.2026):** Исправил. Добавил alias `$lib` в `vitest.config.ts`, чтобы будущие тесты с импортами вида `$lib/...` не ломались.

---

## Stage 1.5

### 3. Нет тестов для `extractImage`
- **Файл:** `src/lib/server/news-utils.ts`
- **Суть:** Новая функция `extractImage` не покрыта тестами. Содержит regex-парсинг и логику с media:content — стоит добавить тесты.
- **Источник:** Stage 1.5 Review (14.02.2026)
- **Статус:** Готово
- **Приписка Codex (14.02.2026):** Исправил. Добавил тесты `extractImage` в `src/lib/server/news-utils.test.ts` (enclosure, media:content object/array, single quotes, no-image fallback).

### 4. Опечатка в JSDoc: "enclave" → "enclosure"
- **Файл:** `src/lib/server/news-utils.ts:32`
- **Суть:** Комментарий говорит `enclave.url` — должно быть `enclosure.url`.
- **Источник:** Stage 1.5 Review (14.02.2026)
- **Статус:** Готово
- **Приписка Codex (14.02.2026):** Исправил. В `src/lib/server/news-utils.ts` исправлена опечатка JSDoc: `enclave` → `enclosure`.

### 5. `extractImage` regex не ловит одинарные кавычки
- **Файл:** `src/lib/server/news-utils.ts:53`
- **Суть:** Regex `/<img[^>]+src="([^">]+)"/i` не перехватит `<img src='url'>`. Исправление: `/<img[^>]+src=["']([^"'>]+)["']/i`
- **Источник:** Stage 1.5 Review (14.02.2026)
- **Статус:** Готово
- **Приписка Codex (14.02.2026):** Исправил. Regex в `extractImage` обновлён до `["']...["']`, теперь поддерживает двойные и одинарные кавычки.

### 6. setInterval на скрытых часах
- **Файл:** `src/routes/+page.svelte:32-34`
- **Суть:** Таймер обновляет `now` каждую секунду, хотя часы скрыты на мобильных (`hidden md:block`). Можно обновлять раз в минуту.
- **Источник:** Stage 1.5 Review (14.02.2026)
- **Статус:** Готово
- **Приписка Codex (14.02.2026):** Исправил. На главной странице интервал обновления времени уменьшен до 1 минуты (`60_000`), чтобы убрать лишние обновления при скрытом на mobile индикаторе.

### 7. Optional `content` с `{@html}`
- **Файл:** `src/lib/types.ts:9`, `src/routes/news/[id]/+page.svelte:89`
- **Суть:** `content?: string` — optional. Если `undefined`, `{@html item.content}` отрендерит `"undefined"`. Нужна проверка или default.
- **Источник:** Stage 1.5 Review (14.02.2026)
- **Статус:** Готово
- **Приписка Codex (14.02.2026):** Исправил. В `src/routes/news/[id]/+page.svelte` добавлен безопасный fallback `safeContent = item.content ?? ''` перед `{@html}`.

---

## Stage 2

### 8. Таймаут дублирован между config.ts и RssSource
- **Файлы:** `src/lib/server/config.ts:12`, `src/lib/server/sources/rss-source.ts:30`
- **Суть:** `config.ts` экспортирует `RSS_TIMEOUT_MS = 8_000`, но `RssSource` использует свой default `options.timeoutMs ?? 8_000`. Если поменять config — RssSource не обновится.
- **Исправление:** В `rss-source.ts` импортировать `RSS_TIMEOUT_MS` из config.
- **Источник:** Stage 2 Review (15.02.2026)
- **Статус:** Готово
- **Приписка Antigravity (15.02.2026):** Исправил. В `src/lib/server/sources/rss-source.ts` добавлен импорт `RSS_TIMEOUT_MS` из конфига.

### 9. Dead code — SITE_URL в sitemap.xml
- **Файл:** `src/routes/sitemap.xml/+server.ts:4`
- **Суть:** `const SITE_URL = 'https://technews.dmitry.art'` — объявлена, но не используется.
- **Источник:** Stage 2 Review (15.02.2026)
- **Статус:** Готово
- **Приписка Antigravity (15.02.2026):** Исправил. Неиспользуемая константа `SITE_URL` удалена.

### 10. Canonical URL захардкожен
- **Файл:** `src/routes/+page.svelte`
- **Суть:** Домен `https://technews.dmitry.art/` захардкожен в canonical link. При смене домена или в dev — будет неверным.
- **Источник:** Stage 2 Review (15.02.2026)
- **Статус:** Готово
- **Приписка Antigravity (15.02.2026):** Исправил. Canonical URL теперь формируется динамически и передаётся с сервера.

### 11. CSP: unsafe-inline → nonce (техдолг для Stage 5)
- **Файл:** `src/hooks.server.ts:18`
- **Суть:** `script-src 'self' 'unsafe-inline'` снижает защиту от XSS. Нужна миграция на nonce-based CSP через `%sveltekit.nonce%`.
- **Источник:** Stage 2 Review (15.02.2026)
- **Статус:** Открыто (отложить до Stage 5)

### 12. createNewsSources() пересоздаётся при каждом вызове
- **Файлы:** `src/lib/server/news-service.ts:183,239`
- **Суть:** Создаёт новые инстансы RssSource при каждом fetchAllNews() и getServiceStatus(). Стоит создать один раз на уровне модуля.
- **Источник:** Stage 2 Review (15.02.2026)
- **Статус:** Готово
- **Приписка Antigravity (15.02.2026):** Исправил. Источники инициализируются один раз как singleton в module scope.

### 13. Epoch-даты в sitemap
- **Файл:** `src/routes/sitemap.xml/+server.ts:27`
- **Суть:** Невалидные pubDate превращаются в `1970-01-01` в lastmod. Нужна фильтрация.
- **Источник:** Stage 2 Review (15.02.2026)
- **Статус:** Готово (фильтрация добавлена в Stage 3)

---

## Stage 3

### 14. `DEFAULT_DATABASE_URL` с паролем в исходниках
- **Файл:** `src/lib/server/db/index.ts:6-7`
- **Суть:** `postgresql://technews:dev_password@localhost:5432/technews` — dev-пароль захардкожен. Лучше выбрасывать ошибку если `DATABASE_URL` не задан.
- **Источник:** Stage 3 Review (15.02.2026)
- **Статус:** Готово
- **Приписка Antigravity (15.02.2026):** Исправил. Дефолтный URL удалён, добавлена обязательная проверка `env.DATABASE_URL`.

### 15. `isFeedSourceExistsByName` — неиспользуемая функция
- **Файл:** `src/lib/server/db/news-repository.ts:170-184`
- **Суть:** Экспортируется, но не используется. Заготовка для будущих этапов.
- **Источник:** Stage 3 Review (15.02.2026)
- **Статус:** Готово
- **Приписка Antigravity (15.02.2026):** Исправил. Неиспользуемая функция удалена.

### 16. `dev-scheduler.ts` — `setInterval` не очищается
- **Файл:** `src/lib/server/jobs/dev-scheduler.ts:70-72`
- **Суть:** Нет механизма остановки интервала. Для dev — не критично благодаря глобальному флагу.
- **Источник:** Stage 3 Review (15.02.2026)
- **Статус:** Готово
- **Приписка Antigravity (15.02.2026):** Исправил. Добавлена очистка `clearInterval` для поддержки HMR.

### 17. Рассинхрон `content_snippet` — varchar(500) vs MAX_SNIPPET_LENGTH=300
- **Файлы:** `src/lib/server/db/schema.ts:39`, `src/lib/server/config.ts:13`
- **Суть:** Схема позволяет 500 символов, код обрезает до 300.
- **Источник:** Stage 3 Review (15.02.2026)
- **Статус:** Готово
- **Приписка Antigravity (15.02.2026):** Исправил. `MAX_SNIPPET_LENGTH` увеличен до 500.
