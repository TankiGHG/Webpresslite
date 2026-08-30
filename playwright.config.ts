import { config as loadEnv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

// The suite needs ROOT_DOMAIN to build tenant hosts and CRON_SECRET to drive
// the scheduler; Playwright does not read the env files on its own.
loadEnv({ path: '.env.local', quiet: true });
loadEnv({ path: '.env', quiet: true });

const baseURL = process.env.E2E_BASE_URL ?? 'http://lvh.me:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Runs the same standalone server as production. The dev server would
        // also work, but its per-route compilation makes the suite flaky.
        command: 'pnpm build && pnpm start',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
