# Инструкции для агентов — News Aggregator

## О проекте
Интеллектуальный агрегатор технологических новостей. Стек: SvelteKit 5 (Runes) + TypeScript + TailwindCSS. Язык интерфейса: русский.

## Базовые команды

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev

# Сборка production
npm run build

# Предпросмотр сборки
npm run preview
```

## Проверка кода

```bash
# Полная проверка (TypeScript + Svelte)
npm run check

# Проверка в режиме watch
npm run check:watch
```

## Тестирование

```bash
# Запуск всех тестов (watch-режим)
npm run test

# Запуск всех тестов (один раз)
npm run test:run

# Запуск конкретного тест-файла
npx vitest run news-utils.test.ts

# Запуск тестов по названию describe/it
npx vitest run -t "stripHtml"

# Watch-режим для конкретного файла
npx vitest news-utils.test.ts
```

Тесты расположены в `src/**/*.test.ts`, используют Vitest с окружением `node`.

## Стиль кода

### TypeScript
- **Strict mode** обязателен — никаких `any`
- Типы импортируются явно: `import type { Foo } from '...'`
- Интерфейсы для объектов данных (не type alias)
- Отступы: 2 пробела
- Кавычки: одинарные
- Точки с запятой: обязательны
- Максимальная длина строки: ~100 символов

### Импорты
```typescript
// 1. Внешние библиотеки
import Parser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';

// 2. Алиасы проекта ($lib)
import type { NewsItem } from '$lib/types';
import { stripHtml } from './news-utils';

// 3. Относительные импорты
import { helper } from '../utils';
```

### Именование
- Компоненты: `PascalCase.svelte` (`NewsCard.svelte`)
- Интерфейсы: `PascalCase` (`interface NewsItem`)
- Функции/переменные: `camelCase` (`stripHtml`, `newsCache`)
- Константы: `UPPER_SNAKE` (`RSS_TIMEOUT_MS`, `CACHE_TTL_MS`)
- Файлы: `kebab-case.ts` (`news-utils.ts`)

### Svelte 5 (Runes)
- **Не использовать stores** (writable, readable)
- Использовать `$props()` для входных параметров
- Использовать `$state()` для реактивного состояния
- Использовать `$derived()` для вычисляемых значений
- Использовать `$effect()` для side effects

```svelte
<script lang="ts">
  let { data } = $props<{ data: PageData }>();
  let layout = $state<'ltr' | 'masonry'>('ltr');
  let updatedLabel = $derived(now.toLocaleTimeString('ru-RU'));
</script>
```

### Обработка ошибок
- Явная обработка ошибок через try/catch
- Логирование через `console.error`/`console.warn`
- Функции, использующие fetch, должны принимать `fetchFn: typeof fetch`

### Безопасность
- Всегда санитизировать HTML: `sanitize-html`
- Декодировать entities: `html-entities`
- Таймауты на внешние запросы (8s для RSS)
- `noopener noreferrer` на внешние ссылки
- CSP-заголовки через SvelteKit

### CSS/Tailwind
- Использовать классы Tailwind
- Dark mode: `dark:` префиксы
- Плавные переходы: `transition-colors duration-300`
- Отступы через систему spacing Tailwind

## Обязательный контекст
Перед работой прочитать в порядке:
1. `AI_MEMORY.md` — текущий этап и прогресс
2. `ROADMAP.md` — поэтапный план с задачами
3. Последний файл в `ai_code_reviews/` — замечания

## После изменений

```bash
npm run check && npm run build && npm run test:run
```

## Коммиты
- `feat:` — новая функциональность
- `fix:` — исправление
- `refactor:` — рефакторинг
- `test:` — тесты
- `chore:` — конфигурация
