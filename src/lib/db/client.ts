import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getEnv } from '@/lib/env';
import * as schema from './schema';

/**
 * A single pooled connection per process. Next.js re-evaluates modules on every
 * hot reload, and the build step imports modules without a database available,
 * so the connection is created lazily and cached on `globalThis`.
 */
const globalForDb = globalThis as unknown as {
  __webpresslite_sql?: postgres.Sql;
  __webpresslite_db?: ReturnType<typeof createDb>;
};

function createDb(sql: postgres.Sql) {
  return drizzle(sql, { schema });
}

export function getSql(): postgres.Sql {
  globalForDb.__webpresslite_sql ??= postgres(getEnv().DATABASE_URL, { max: 10 });
  return globalForDb.__webpresslite_sql;
}

export function getDb(): Database {
  globalForDb.__webpresslite_db ??= createDb(getSql());
  return globalForDb.__webpresslite_db;
}

export type Database = ReturnType<typeof createDb>;
