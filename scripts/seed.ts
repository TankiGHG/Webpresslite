/**
 * Development seed: 1 user, 1 site, 5 posts, 3 images.
 *
 * The tables these records live in are introduced phase by phase, so this
 * script grows with the schema. It stays runnable from phase 0 on and refuses
 * to touch a production database.
 */
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.');
  }

  console.info('Seeding webpresslite...');
  console.info('Nothing to seed yet - the schema is introduced from phase 1 onwards.');
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
