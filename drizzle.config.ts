import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://technews:dev_password@localhost:5432/technews'
  },
  migrations: {
    table: 'migrations',
    schema: 'public'
  }
});
