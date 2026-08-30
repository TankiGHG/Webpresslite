import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

export const PASSWORD = 'correct-horse-battery';

/** Tenant hosts are built from the root domain, not from the base URL. */
export const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'lvh.me:3000';

export function unique(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function registerUser(page: Page): Promise<string> {
  const email = `${unique('e2e-')}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Site Tester');
  await page.getByLabel('E-Mail').fill(email);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await page.waitForURL('**/dashboard');
  return email;
}

export async function createSite(page: Page, name: string, subdomain: string) {
  await page.goto('/dashboard');
  await page.getByLabel('Name der Site').fill(name);
  await page.getByLabel('Subdomain').fill(subdomain);
  await page.getByRole('button', { name: 'Site anlegen' }).click();
  await expect(page.getByTestId('site-list')).toContainText(name);
}

/** The base URL Playwright is configured with, for contexts created by hand. */
export function baseURLOf(info: { project: { use: { baseURL?: string } } }): string {
  return info.project.use.baseURL ?? 'http://lvh.me:3000';
}

interface WorkerAccount {
  email: string;
  storageStatePath: string;
}

/**
 * Registers one account per worker and hands every test a signed-in context.
 *
 * Registering per test would put a dozen sign-ups per run against the per-IP
 * rate limit, which is a production safeguard we do not want to weaken just to
 * make the suite pass.
 */
export const test = base.extend<object, { workerAccount: WorkerAccount }>({
  workerAccount: [
    async ({ browser }, use, workerInfo) => {
      // A worker-scoped context does not inherit `use.baseURL`, so relative
      // navigation has to be given the base URL explicitly.
      const context = await browser.newContext({ baseURL: baseURLOf(workerInfo) });
      const page = await context.newPage();
      const email = await registerUser(page);

      const storageStatePath = join(mkdtempSync(join(tmpdir(), 'wpl-e2e-')), 'state.json');
      await context.storageState({ path: storageStatePath });
      await context.close();

      await use({ email, storageStatePath });
    },
    { scope: 'worker' },
  ],

  storageState: async ({ workerAccount }, use) => {
    await use(workerAccount.storageStatePath);
  },
});

export { expect };
