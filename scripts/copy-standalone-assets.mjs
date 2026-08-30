/**
 * `output: 'standalone'` emits a server bundle but leaves the static assets
 * behind, so `node .next/standalone/server.js` would serve pages without CSS
 * or client chunks. Next's docs put the copying on the deployment; doing it
 * here means `pnpm start` and the Docker image behave the same.
 */
import { cp, access } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(standalone))) {
  console.error('No standalone build found. Run `next build` first.');
  process.exit(1);
}

await cp(join(root, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true });

if (await exists(join(root, 'public'))) {
  await cp(join(root, 'public'), join(standalone, 'public'), { recursive: true });
}

console.info('Copied static assets into .next/standalone');
