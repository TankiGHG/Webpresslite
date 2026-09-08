import { expect, test } from '@playwright/test';

test('the landing page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Konto anlegen' }).first()).toBeVisible();
});

test('the health endpoint reports database and storage', async ({ request }) => {
  const response = await request.get('/api/health');
  const body = await response.json();

  expect(body).toMatchObject({
    status: expect.stringMatching(/^(ok|error)$/),
    checks: {
      database: { status: expect.any(String) },
      storage: { status: expect.any(String) },
    },
  });
});
