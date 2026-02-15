# TechNews

Интеллектуальный агрегатор технологических новостей на `SvelteKit 5 + TypeScript + TailwindCSS`.

## Полный локальный запуск (одна инструкция)

### 0) Требования

- Node.js `v24+`
- Docker + Docker Compose
- (Опционально) Portainer: `https://localhost:9443`

### 1) Проверка и запуск Docker

Проверить Docker:

```bash
docker version
docker info
docker ps
```

Если Docker daemon не запущен (Linux):

```bash
sudo systemctl start docker
sudo systemctl status docker
```

Автозапуск Docker после перезагрузки:

```bash
sudo systemctl enable docker
```

### 2) Запуск проекта

```bash
cd /home/darksidr/projects/news
npm install
cp .env.example .env
npm run dev
```

Приложение будет доступно на `http://localhost:5173`.

### 3) Поднять PostgreSQL в Docker

```bash
cd /home/darksidr/projects/news
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

Ожидаемый контейнер: `technews-postgres`.

### 4) Применить схему базы данных

```bash
cd /home/darksidr/projects/news
npm run db:push
```

### 5) Заполнить БД новостями (ручной cron-триггер)

```bash
cd /home/darksidr/projects/news
source .env
curl -X POST http://localhost:5173/api/cron/fetch \
  -H "Authorization: Bearer $CRON_SECRET"
```

Примечание: в dev-режиме также работает встроенный планировщик (`DEV_FETCH_INTERVAL_MS`).

## Управление проектом

### Остановить приложение

В терминале с `npm run dev`: `Ctrl + C`.

### Остановить только PostgreSQL контейнер проекта

```bash
cd /home/darksidr/projects/news
docker compose -f docker-compose.dev.yml stop
```

### Полностью остановить и удалить контейнер проекта

```bash
cd /home/darksidr/projects/news
docker compose -f docker-compose.dev.yml down
```

### Полностью остановить Docker daemon (если нужно)

```bash
sudo systemctl stop docker
```

## Проверка, что приложение реально работает с PostgreSQL

### 1) Проверить health endpoint

```bash
curl http://localhost:5173/api/health
```

Должно быть `db.connected: true`.

### 2) Посмотреть базу напрямую (через psql в контейнере)

```bash
docker exec -it technews-postgres psql -U technews -d technews
```

Полезные SQL-команды:

```sql
\dt
select count(*) from feed_sources;
select count(*) from articles;
select count(*) from fetch_logs;

select id, name, last_fetched_at from feed_sources order by id;
select title, pub_date from articles order by pub_date desc limit 10;
select source_id, new_items_count, fetched_at, error
from fetch_logs
order by fetched_at desc
limit 10;
```

Выход из `psql`:

```sql
\q
```

### 3) Жёсткая проверка “UI читает из БД”

Очистить новости в БД:

```bash
docker exec -it technews-postgres psql -U technews -d technews -c "truncate table articles cascade;"
```

После этого:

1. Обновите `http://localhost:5173` — лента станет пустой.
2. Дерните cron (`POST /api/cron/fetch`).
3. Обновите страницу — новости вернутся.

Это подтверждает, что данные читаются именно из PostgreSQL.

## Работа через Portainer

Portainer URL: `https://localhost:9443`

Где смотреть:

1. `Containers` -> `technews-postgres`
2. `Logs` — логи PostgreSQL
3. `Console` — можно открыть shell и выполнить `psql -U technews -d technews`

Важно: Portainer управляет контейнером, но SQL удобнее и быстрее проверять через терминал `docker exec ... psql`.

## Переменные окружения (`.env`)

Основные переменные:

- `DATABASE_URL` — строка подключения к PostgreSQL
- `CRON_SECRET` — токен для `POST /api/cron/fetch`
- `DEV_FETCH_INTERVAL_MS` — интервал встроенного dev-планировщика
- `RSS_TIMEOUT_MS` — таймаут RSS-запросов
- `CACHE_TTL_MS` — TTL кеша
- `MAX_SNIPPET_LENGTH` — длина сниппета
- `BLOCKED_DOMAINS` — блок-лист доменов

## Защита сайта (Basic Auth)

Для временного закрытия доступа к сайту (например, на этапе разработки) можно использовать Basic Auth.

Для этого задайте переменные окружения:

- `SITE_PROTECTION_USER` — логин
- `SITE_PROTECTION_PASSWORD` — пароль

Если переменные не заданы — сайт открыт для всех.

## Проверка проекта

```bash
npm run check
npm run build
npm run test:run
```

## Полезные эндпоинты

- `GET /api/health` — проверка состояния БД
- `GET /sitemap.xml` — sitemap на основе данных из БД
- `POST /api/cron/fetch` — ручной запуск сборщика новостей
