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
