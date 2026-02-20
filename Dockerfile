# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
WORKDIR /app
# Build-time arg для инвалидации кеша (обновляет version.json)
ARG BUILDTIME
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL нужен только чтобы пройти SvelteKit analyse — реальное значение подставляется в runtime
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npm run build && npm prune --production

# ---- Stage 3: Production Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/build ./build
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/drizzle ./drizzle
COPY --from=builder --chown=appuser:appgroup /app/drizzle.config.ts ./

USER appuser

EXPOSE 3000

# Ограничение памяти для Node.js (подходит для 2GB RAM сервера)
CMD ["node", "--max-old-space-size=256", "build/index.js"]
