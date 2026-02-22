# Интеграция n8n + Telegram

Инструкция по настройке автоматической отправки новостей с darksidr.ru в Telegram-канал через n8n.

---

## Шаг 1 — Подготовка Telegram

1. Создай бота через `@BotFather` в Telegram → `/newbot`
2. Сохрани **токен бота** (формат: `1234567890:ABCdef...`)
3. Создай канал и добавь бота как **администратора**
4. Получи `chat_id` канала:
   - Для публичного канала: `@username_канала`
   - Для приватного: перешли любое сообщение боту `@userinfobot`

---

## Шаг 2 — Установка n8n на сервер

### 2.1 DNS-запись
Добавь A-запись в панели управления доменом `darksidr.ru`:

| Имя | Тип | Значение |
|-----|-----|---------|
| `n8n.darksidr.ru.` | A | `185.231.244.254` |

### 2.2 Docker Compose

```bash
mkdir -p /srv/n8n
cat > /srv/n8n/docker-compose.yml << 'YAML'
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    environment:
      - N8N_HOST=n8n.darksidr.ru
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.darksidr.ru/
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - proxy

volumes:
  n8n_data:

networks:
  proxy:
    external: true
YAML

cd /srv/n8n && docker compose up -d
```

### 2.3 Добавить в Caddy

```bash
nano /srv/caddy/Caddyfile
```

Добавить блок:
```
n8n.darksidr.ru {
    reverse_proxy n8n:5678
}
```

Перезагрузить Caddy:
```bash
cd /srv/caddy && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

n8n будет доступен по адресу: **https://n8n.darksidr.ru**

---

## Шаг 3 — JSON API для получения статей

Сейчас на сайте нет отдельного API для статей. Нужно добавить endpoint.

**Попроси разработчика (или AI) добавить:**

```
GET https://darksidr.ru/api/articles?limit=20&since=<ISO_timestamp>
```

Ответ должен возвращать JSON:
```json
[
  {
    "id": "HackerNews:abc123",
    "title": "Original title",
    "translatedTitle": "Переведённый заголовок",
    "link": "https://example.com/article",
    "pubDate": "2026-02-19T10:00:00Z",
    "source": "HackerNews",
    "language": "en"
  }
]
```

---

## Шаг 4 — Workflow в n8n

### Логика

```
[Cron: каждые 15 мин]
        ↓
[HTTP Request: GET /api/articles?since=...]
        ↓
[IF: массив не пустой]
        ↓ Да
[Split In Batches: по 1 статье]
        ↓
[Telegram: отправить сообщение]
```

### Настройка нод

**1. Cron node**
- Interval: каждые 15 минут

**2. HTTP Request node**
- Method: `GET`
- URL: `https://darksidr.ru/api/articles`
- Query params: `limit=20`, `since={{ $now.minus(15, 'minutes').toISO() }}`

**3. IF node**
- Condition: `{{ $json.length > 0 }}`

**4. Split In Batches node**
- Batch size: `1`

**5. Telegram node**
- Credential: токен бота
- Chat ID: `@твой_канал`
- Message (HTML):

```
📰 <b>{{ $json.translatedTitle || $json.title }}</b>

🔗 <a href="{{ $json.link }}">Читать оригинал</a>
📌 {{ $json.source }}
```

---

## Справочная информация о проекте

### Технический стек
- **Framework:** SvelteKit 5 + TypeScript
- **БД:** PostgreSQL 16 + Drizzle ORM
- **Деплой:** Docker + Caddy (auto-SSL)

### Схема таблицы articles (PostgreSQL)

```sql
id               VARCHAR(500)   -- уникальный ID статьи
title            TEXT           -- оригинальный заголовок
translated_title TEXT           -- переведённый заголовок (NULL если не переведено)
link             TEXT           -- ссылка на источник
pub_date         TIMESTAMPTZ    -- дата публикации
language         VARCHAR(10)    -- 'ru' или 'en'
is_translated    BOOLEAN        -- переведена ли статья
source_id        INTEGER        -- ID источника (JOIN с feed_sources)
```

### Таблица feed_sources

```sql
id       SERIAL
name     VARCHAR(100)  -- OpenNET, Habr, HackerNews, Phoronix и др.
url      TEXT
language VARCHAR(10)
```

### Источники новостей
OpenNET, Habr, HackerNews, Phoronix, TechCrunch AI, Google Web.dev,
MDN Blog, Microsoft TypeScript, CNCF Blog, Ars Technica, Dev.to, React, GitHub Blog, OpenAI, PostgreSQL

### Cron endpoint (ручной запуск сбора)
```bash
curl -X POST https://darksidr.ru/api/cron/fetch \
  -H "Authorization: Bearer <CRON_SECRET>"
```

---

## Важные детали

- Статьи обновляются автоматически **каждые 15 минут** через системный cron
- `translated_title` может быть `NULL` — всегда делай fallback: `translatedTitle || title`
- Дедупликация по полю `id` — n8n не отправит дубли если настроить проверку
- Все новости ведут напрямую на источник (не на страницу сайта)
