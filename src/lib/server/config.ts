/**
 * Конфигурация сервиса новостей
 * 
 * Для переопределения создайте .env файл в корне проекта:
 * RSS_TIMEOUT_MS=8000
 * CACHE_TTL_MS=300000
 * MAX_SNIPPET_LENGTH=300
 * BLOCKED_DOMAINS=css-doodle.com,example.com
 */

// RSS таймаут (мс)
export const RSS_TIMEOUT_MS = 8_000;

// TTL кеша (мс) - по умолчанию 5 минут
export const CACHE_TTL_MS = 5 * 60 * 1000;

// Максимальная длина сниппета
export const MAX_SNIPPET_LENGTH = 300;

// Блокированные домены
export const BLOCKED_DOMAINS: string[] = ['css-doodle.com'];
