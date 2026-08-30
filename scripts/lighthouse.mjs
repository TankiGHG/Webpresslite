/**
 * Runs Lighthouse against the public pages of a site and fails when a category
 * drops below the threshold from the project plan.
 *
 * Usage: pnpm lighthouse [baseUrl]
 * The server must already be running (`pnpm build && pnpm start`).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.argv[2] ?? process.env.LIGHTHOUSE_URL ?? 'http://demo.lvh.me:3000';
const CATEGORIES = ['performance', 'accessibility', 'seo'];
const THRESHOLD = 95;

// best-practices is reported but not enforced: it fails on `is-on-https`
// whenever the run happens over plain HTTP, which is how local runs work.
const REPORTED = [...CATEGORIES, 'best-practices'];

const pages = [
  ['Startseite', '/'],
  ['Beitrag', '/beitrag/willkommen-bei-webpresslite'],
  ['Archiv', '/archiv'],
];

const workDir = mkdtempSync(join(tmpdir(), 'lighthouse-'));
let failed = false;

for (const [label, path] of pages) {
  const out = join(workDir, `${label}.json`);
  const result = spawnSync(
    'node',
    [
      './node_modules/lighthouse/cli/index.js',
      `${base}${path}`,
      `--only-categories=${REPORTED.join(',')}`,
      '--output=json',
      `--output-path=${out}`,
      '--quiet',
      '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'], env: process.env },
  );

  if (result.status !== 0) {
    console.error(`${label}: Lighthouse konnte nicht ausgeführt werden.`);
    failed = true;
    continue;
  }

  const report = JSON.parse(readFileSync(out, 'utf8'));
  const scores = Object.fromEntries(
    REPORTED.map((key) => [key, Math.round((report.categories[key]?.score ?? 0) * 100)]),
  );

  const shortfall = CATEGORIES.filter((key) => scores[key] < THRESHOLD);
  if (shortfall.length > 0) failed = true;

  console.info(
    `${shortfall.length === 0 ? 'ok  ' : 'FAIL'} ${label.padEnd(12)} ` +
      REPORTED.map((key) => `${key}=${scores[key]}`).join('  '),
  );
}

rmSync(workDir, { recursive: true, force: true });

if (failed) {
  console.error(`\nMindestens eine Kategorie liegt unter ${THRESHOLD}.`);
  process.exit(1);
}

console.info(`\nAlle Seiten erreichen mindestens ${THRESHOLD} in ${CATEGORIES.join(', ')}.`);
