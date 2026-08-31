/**
 * Applies pending migrations, then exits.
 *
 * Runs at container start, before the server accepts traffic. It uses the
 * migrator from `drizzle-orm` rather than `drizzle-kit`, because the production
 * image carries no dev dependencies.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const RETRIES = Number(process.env.MIGRATE_RETRIES ?? 10);
const RETRY_DELAY_MS = Number(process.env.MIGRATE_RETRY_DELAY_MS ?? 2000);

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // A single connection: the migration runner is the only user of it, and
  // `max: 1` keeps the advisory lock on one session.
  // `onnotice` is silenced: "schema already exists, skipping" on every restart
  // is noise in a boot log, not information.
  const sql = postgres(url as string, { max: 1, onnotice: () => {} });

  // The database container may still be starting up. Compose health checks
  // cover the normal case; this covers the rest without failing the boot.
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      await sql`select 1`;
      break;
    } catch (error) {
      if (attempt === RETRIES) {
        console.error(`Database not reachable after ${RETRIES} attempts.`, error);
        await sql.end({ timeout: 5 });
        process.exit(1);
      }
      console.info(`Database not ready yet (attempt ${attempt}/${RETRIES}), retrying...`);
      await wait(RETRY_DELAY_MS);
    }
  }

  const startedAt = Date.now();
  try {
    await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
    console.info(`Migrations applied in ${Date.now() - startedAt}ms.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
