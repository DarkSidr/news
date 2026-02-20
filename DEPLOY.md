# Деплой на VPS (Ubuntu 22.04)

## Архитектура на сервере

```
Internet → Caddy (80/443, auto-HTTPS) → Docker network "proxy"
                                              ├── news-app:3000
                                              ├── other-project-1
                                              └── other-project-2

news-app → news-internal network → news-postgres
```

Каждый проект живёт в своём `docker-compose.yml`, все подключены к общей сети `proxy`.
Caddy автоматически выдаёт SSL и проксирует по доменам.

---

## Шаг 1 — Первоначальная настройка сервера

### 1.1 Подключись и обнови систему
```bash
ssh user@YOUR_VPS_IP
sudo apt update && sudo apt upgrade -y
```

### 1.2 Установи Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

### 1.3 Создай общую Docker-сеть для всех проектов
```bash
docker network create proxy
```

### 1.4 Запусти Caddy как обратный прокси
Создай папку и конфиг Caddy:
```bash
mkdir -p /srv/caddy
cat > /srv/caddy/Caddyfile << 'CADDY'
{
    email your@email.com
}
CADDY
```

Создай `docker-compose.yml` для Caddy:
```bash
cat > /srv/caddy/docker-compose.yml << 'CADDY'
services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - proxy

volumes:
  caddy_data:
  caddy_config:

networks:
  proxy:
    external: true
CADDY

cd /srv/caddy && docker compose up -d
```

---

## Шаг 2 — Настрой SSH-доступ для GitHub Actions

На своём **локальном компьютере** (или на сервере):
```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy -N ""
```

**Публичный ключ** добавь на сервер:
```bash
cat ~/.ssh/github_deploy.pub | ssh user@YOUR_VPS_IP "cat >> ~/.ssh/authorized_keys"
```

**Приватный ключ** добавь в GitHub → Settings → Secrets and variables → Actions:
- `VPS_HOST` — IP адрес сервера
- `VPS_USER` — имя пользователя (например, `ubuntu`)
- `VPS_SSH_KEY` — содержимое `~/.ssh/github_deploy` (приватный ключ)
- `VPS_PORT` — `22` (или другой SSH порт)

---

## Шаг 3 — Разверни проект на сервере

### 3.1 Клонируй репозиторий
```bash
mkdir -p /srv/news
git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git /srv/news
cd /srv/news
```

### 3.2 Создай `.env` из примера
```bash
cp .env.example .env
nano .env
```

Заполни обязательные поля:
- `DOMAIN` — твой домен (например, `news.yourdomain.com`)
- `POSTGRES_PASSWORD` — сгенерируй: `openssl rand -hex 32`
- `DATABASE_URL` — должен совпадать с `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `CRON_SECRET` — сгенерируй: `openssl rand -hex 32`
- `CF_ACCOUNT_ID` и `CF_AI_TOKEN` — из Cloudflare Dashboard

### 3.3 Настрой домен у Caddy

Добавь в `/srv/caddy/Caddyfile`:
```caddy
news.yourdomain.com {
    reverse_proxy news-app:3000
}
```

Перезагрузи Caddy:
```bash
cd /srv/caddy && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 3.4 Запусти проект
```bash
cd /srv/news
docker compose up -d
```

### 3.5 Запусти миграции БД
```bash
docker compose exec app sh -c "DATABASE_URL=$DATABASE_URL npx drizzle-kit migrate"
```

---

## Шаг 4 — Настрой Cron (сборка RSS каждые 15 минут)

На сервере добавь cron-задачу (замени `YOUR_DOMAIN` и `CRON_SECRET`):
```bash
crontab -e
```
```
*/15 * * * * curl -s -X POST https://news.yourdomain.com/api/cron/fetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET" > /dev/null 2>&1
```

---

## Шаг 5 — Проверь деплой

```bash
# Логи приложения
docker compose -f /srv/news/docker-compose.yml logs -f app

# Статус контейнеров
docker compose -f /srv/news/docker-compose.yml ps

# Проверка сайта
curl -I https://news.yourdomain.com
```

---

## Автодеплой (GitHub Actions)

После настройки секретов в GitHub каждый `git push` в `main` автоматически:
1. Подключается к серверу по SSH
2. Делает `git pull`
3. Пересобирает Docker-образ
4. Перезапускает только контейнер приложения (БД не трогает)
5. Прибирает старые образы

Файл workflow: `.github/workflows/deploy.yml`

---

## Добавление другого проекта на тот же сервер

1. Клонируй проект в `/srv/project-name/`
2. В его `docker-compose.yml` добавь сеть `proxy: external: true`
3. Добавь блок в `/srv/caddy/Caddyfile`
4. Перезагрузи Caddy

---

## Полезные команды

```bash
# Пересборка и рестарт приложения вручную
cd /srv/news && git pull && docker compose build app && docker compose up -d app

# Бэкап БД
docker compose exec postgres pg_dump -U news news > backup_$(date +%Y%m%d).sql

# Мониторинг ресурсов
docker stats
```

---

## Как посмотреть общую картину на сервере

На одном сервере может работать несколько независимых docker-проектов.
Чтобы быстро проверить текущее состояние, используй:

```bash
# Все compose-проекты
docker compose ls

# Все контейнеры (имя, статус, порты)
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Какие контейнеры подключены к общей proxy-сети
docker network inspect proxy --format '{{range .Containers}}{{.Name}}{{println}}{{end}}'

# Текущее потребление ресурсов
docker stats --no-stream
```
