import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000
});

export const db = drizzle(pool, { schema });

// Export schema for direct imports
export { schema };
export * from './schema';
