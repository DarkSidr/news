# Инструкция: Удаление источников Wired и The Verge

> **Дата создания:** 22.02.2026
> **Цель:** Полное удаление источников Wired и The Verge из базы данных (локально и на VPS)

---

## Что было сделано

✅ **Код:** Источники уже удалены из [src/lib/server/sources/rss-source.ts](src/lib/server/sources/rss-source.ts)
✅ **Документация:** Упоминания удалены из README.md, N8N_TELEGRAM.md, QWEN.md
✅ **Миграция:** Создан SQL-скрипт [drizzle/0003_remove_wired_and_verge.sql](drizzle/0003_remove_wired_and_verge.sql)

---

## Удаление из базы данных

### Локально (development)

```bash
# 1. Перейти в директорию проекта
cd /home/darksidr/projects/news

# 2. Применить миграцию
docker compose -f docker-compose.dev.yml exec postgres psql -U technews -d technews -f /path/to/drizzle/0003_remove_wired_and_verge.sql
```

Альтернатива (через Docker копирование):

```bash
# 1. Скопировать SQL файл в контейнер
docker cp drizzle/0003_remove_wired_and_verge.sql technews-postgres:/tmp/cleanup.sql

# 2. Выполнить миграцию
docker compose -f docker-compose.dev.yml exec postgres psql -U technews -d technews -f /tmp/cleanup.sql

# 3. Проверить результат
docker compose -f docker-compose.dev.yml exec postgres psql -U technews -d technews -c "SELECT name FROM feed_sources;"
```

---

### На VPS (production)

#### Вариант 1: Через SSH (рекомендуется)

```bash
# 1. Подключиться к серверу
ssh root@185.231.244.254

# 2. Перейти в директорию проекта
cd /srv/news

# 3. Скопировать SQL файл в контейнер PostgreSQL
docker cp drizzle/0003_remove_wired_and_verge.sql news-postgres:/tmp/cleanup.sql

# 4. Выполнить миграцию
docker compose exec postgres psql -U news -d news -f /tmp/cleanup.sql

# 5. Проверить результат (должно быть 0 строк)
docker compose exec postgres psql -U news -d news -c "SELECT id, name FROM feed_sources WHERE name ILIKE '%wired%' OR name ILIKE '%verge%';"

# 6. Проверить общее количество источников
docker compose exec postgres psql -U news -d news -c "SELECT COUNT(*) as total_sources FROM feed_sources;"

# 7. Проверить статистику по статьям
docker compose exec postgres psql -U news -d news -c "
SELECT
  COALESCE(fs.name, '=== ИТОГО ===') as source,
  COUNT(a.id) as articles_count
FROM feed_sources fs
LEFT JOIN articles a ON fs.id = a.source_id
GROUP BY ROLLUP(fs.name)
ORDER BY (fs.name IS NULL), articles_count DESC
LIMIT 20;"
```

#### Вариант 2: Через GitHub Actions (автоматический деплой)

```bash
# 1. Закоммитить изменения (SQL-миграцию)
git add drizzle/0003_remove_wired_and_verge.sql
git add README.md N8N_TELEGRAM.md QWEN.md
git commit -m "chore: remove Wired and The Verge sources from config and DB"

# 2. Запушить в main
git push origin main

# 3. Дождаться успешного деплоя через GitHub Actions

# 4. Подключиться к серверу для проверки
ssh root@185.231.244.254

# 5. Применить миграцию вручную (см. Вариант 1, шаги 3-7)
```

---

## Проверка успешного удаления

### Чеклист

- [ ] Локальная БД: `SELECT * FROM feed_sources WHERE name ILIKE '%wired%' OR name ILIKE '%verge%'` возвращает 0 строк
- [ ] Production БД (VPS): то же самое
- [ ] `SELECT COUNT(*) FROM articles` уменьшилось (удалились статьи от этих источников)
- [ ] `SELECT COUNT(*) FROM fetch_logs` уменьшилось (удалились логи)
- [ ] Документация обновлена (нет упоминаний Wired/The Verge)
- [ ] После деплоя новые статьи от Wired/The Verge не появляются

---

## SQL-запросы для диагностики

```sql
-- Найти все источники с "wired" или "verge" в названии
SELECT id, name, url FROM feed_sources
WHERE name ILIKE '%wired%' OR name ILIKE '%verge%';

-- Посчитать статьи от удалённых источников (должно быть 0)
SELECT COUNT(*) FROM articles a
JOIN feed_sources fs ON a.source_id = fs.id
WHERE fs.name ILIKE '%wired%' OR fs.name ILIKE '%verge%';

-- Найти "потерянные" записи в telegram_sent_articles
-- (ссылающиеся на несуществующие статьи)
SELECT COUNT(*) FROM telegram_sent_articles
WHERE article_id NOT IN (SELECT id FROM articles);

-- Статистика по источникам (топ-15)
SELECT
  fs.name,
  COUNT(a.id) as articles_count,
  MAX(a.pub_date) as latest_article
FROM feed_sources fs
LEFT JOIN articles a ON fs.id = a.source_id
GROUP BY fs.id, fs.name
ORDER BY articles_count DESC
LIMIT 15;
```

---

## Откат (если что-то пошло не так)

Если удаление было ошибочным, восстановить источники можно так:

```sql
-- Восстановить источник Wired
INSERT INTO feed_sources (name, url, type, language, is_active)
VALUES ('Wired', 'https://www.wired.com/feed/rss', 'rss', 'en', true);

-- Восстановить источник The Verge
INSERT INTO feed_sources (name, url, type, language, is_active)
VALUES ('The Verge', 'https://www.theverge.com/rss/index.xml', 'rss', 'en', true);
```

**Важно:** Статьи НЕ восстановятся автоматически, только при следующем запуске cron.

---

## Итоговая статистика

После удаления Wired и The Verge:

- **Источников осталось:** ~50+ (Habr хабы + англоязычные источники)
- **Статьи:** только от активных качественных источников
- **Размер БД:** уменьшился (зависит от количества удалённых статей)

---

## Очистка логов и старых данных (бонус)

Если хочешь дополнительно очистить старые новости (>14 дней):

```sql
-- Посчитать старые статьи
SELECT COUNT(*) FROM articles
WHERE pub_date < NOW() - INTERVAL '14 days';

-- Удалить статьи старше 14 дней
DELETE FROM articles
WHERE pub_date < NOW() - INTERVAL '14 days';

-- Очистить orphaned записи из telegram_sent_articles
DELETE FROM telegram_sent_articles
WHERE article_id NOT IN (SELECT id FROM articles);

-- VACUUM для освобождения места
VACUUM FULL articles;
VACUUM FULL telegram_sent_articles;
```

---

**Готово!** Wired и The Verge полностью удалены из проекта.
