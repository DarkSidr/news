# Мелкие рекомендации (backlog)

Некритичные улучшения, выявленные на ревью. После исправления — пометить "Готово".

---

## Stage 1

### 1. `manifest.webmanifest` — разделить `purpose`
- **Файл:** `static/manifest.webmanifest`
- **Суть:** Сейчас `"purpose": "any maskable"` на одной иконке. Maskable-иконки обрезаются (safe zone 80%), поэтому лучше иметь отдельные записи: одну с `"purpose": "any"`, другую с `"purpose": "maskable"` (с увеличенным padding).
- **Источник:** Fix Review #2 (13.02.2026)
- **Статус:** Ожидает

### 2. `vitest.config.ts` — нет `$lib` alias
- **Файл:** `vitest.config.ts`
- **Суть:** Конфиг Vitest не наследует `$lib` alias из SvelteKit. Сейчас тесты импортируют по относительному пути и работают. Но если появятся тесты с `import ... from '$lib/...'`, они сломаются. Нужно добавить resolve aliases или использовать `@sveltejs/kit/vite`.
- **Источник:** Fix Review #2 (13.02.2026)
- **Статус:** Ожидает
