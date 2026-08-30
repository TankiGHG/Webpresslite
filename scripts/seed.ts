/**
 * Development seed: 1 user, 1 site, 5 posts, 3 images.
 *
 * The tables these records live in are introduced phase by phase, so this
 * script grows with the schema. It is idempotent and refuses to touch a
 * production database.
 */
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const SEED_EMAIL = 'demo@example.com';
const SEED_PASSWORD = 'demo-password-123';
const SEED_NAME = 'Demo Nutzerin';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.');
  }

  const { getDb } = await import('../src/lib/db/client');
  const { user } = await import('../src/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  const existing = await getDb().select().from(user).where(eq(user.email, SEED_EMAIL)).limit(1);

  if (existing.length > 0) {
    console.info(`Seed user ${SEED_EMAIL} already exists, nothing to do.`);
    return;
  }

  // Going through the Better Auth API rather than inserting rows keeps the
  // password hashing identical to a real registration.
  const { getAuth } = await import('../src/lib/auth/server');
  await getAuth().api.signUpEmail({
    body: { name: SEED_NAME, email: SEED_EMAIL, password: SEED_PASSWORD },
  });

  console.info(`Created seed user ${SEED_EMAIL} (password: ${SEED_PASSWORD})`);
  console.info('Sites, posts and media follow in phases 2, 3 and 5.');
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
