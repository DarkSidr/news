import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';

const DEFAULT_DATABASE_URL =
  'postgresql://technews:dev_password@localhost:5432/technews';

function getConnectionString(): string {
  return env.DATABASE_URL || DEFAULT_DATABASE_URL;
}

/**
 * Create database client
 */
export function createClient(): Client {
  return new Client({
    connectionString: getConnectionString()
  });
}

/**
 * Create Drizzle ORM instance
 * Usage:
 *   const client = createClient();
 *   await client.connect();
 *   const db = createDrizzle(client);
 *   const articles = await db.query.articles.findMany();
 *   await client.end();
 */
export function createDrizzle(client: Client) {
  return drizzle({ client, schema });
}

/**
 * Initialize database connection
 * Returns connected client and db instance
 * Remember to call client.end() when done!
 */
export async function initDb() {
  const client = createClient();
  await client.connect();
  const db = createDrizzle(client);
  return { client, db };
}

// Export schema for direct imports
export { schema };
export * from './schema';
