import { createSite, expect, ROOT_DOMAIN, test, unique } from './fixtures';
import type { Page } from '@playwright/test';

async function siteWith(page: Page, name: string) {
  const subdomain = unique('stat');
  await createSite(page, name, subdomain);
  await page.goto('/dashboard');
  await page.getByRole('link', { name }).click();
  await page.waitForURL('**/sites/**');
  return { siteId: page.url().split('/sites/')[1] as string, subdomain };
}

test('reading a post is counted and shows up in the statistics', async ({ page }) => {
  test.setTimeout(120_000);
  const { siteId, subdomain } = await siteWith(page, `Zahlen ${unique('')}`);

  await page.goto(`/sites/${siteId}/statistik`);
  await expect(page.getByTestId('no-stats')).toBeVisible();

  await page.goto(`/sites/${siteId}/posts`);
  await page.getByLabel('Titel').fill('Vielgelesener Beitrag');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await page.waitForURL('**/posts/**');
  await page.locator('.prose-editor').click();
  await page.keyboard.type('Inhalt, der Aufrufe sammelt.');
  await expect(page.getByTestId('save-state')).toHaveText('Gespeichert', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(page.getByTestId('post-status')).toHaveAttribute('data-status', 'published');

  const url = `http://${subdomain}.${ROOT_DOMAIN}/beitrag/vielgelesener-beitrag`;
  for (let visit = 0; visit < 3; visit += 1) {
    await page.goto(url);
    await expect(page.getByTestId('post-title')).toBeVisible();
  }

  // Views are written after the response, so give the writes a moment.
  await expect(async () => {
    await page.goto(`/sites/${siteId}/statistik`);
    await expect(page.getByTestId('top-posts')).toContainText('Vielgelesener Beitrag');
  }).toPass({ timeout: 30_000 });

  await expect(page.getByTestId('views-chart')).toBeVisible();
  await expect(page.getByTestId('stat-tiles')).toContainText('Aufrufe');

  // The chart carries a text alternative rather than being colour alone.
  const label = await page.getByTestId('views-chart').getAttribute('aria-label');
  expect(label).toMatch(/Seitenaufrufe der letzten 30 Tage/);
});

test('a custom domain needs the pro plan and a verified TXT record', async ({ page }) => {
  test.setTimeout(120_000);
  const { siteId } = await siteWith(page, `Domain ${unique('')}`);

  // On the free plan the form is closed.
  await page.goto(`/sites/${siteId}/domain`);
  await expect(page.getByTestId('plan-blocked')).toBeVisible();
  await expect(page.getByLabel('Eigene Domain')).toBeDisabled();

  // Upgrade through the stub, then the form opens.
  await page.goto(`/sites/${siteId}/plan`);
  await page.getByTestId('switch-to-pro').click();
  await expect(page.getByTestId('plan-notice')).toContainText('pro');

  await page.goto(`/sites/${siteId}/domain`);
  await expect(page.getByTestId('plan-blocked')).toHaveCount(0);

  const domain = `${unique('kunde-')}.example.com`;
  await page.getByLabel('Eigene Domain').fill(domain);
  await page.getByRole('button', { name: 'Domain speichern' }).click();

  // The instructions name the exact record to create.
  await expect(page.getByTestId('txt-host')).toHaveText(`_webpresslite.${domain}`);
  await expect(page.getByTestId('txt-value')).toContainText('webpresslite-site-verification=');
  await expect(page.getByTestId('domain-status')).toHaveAttribute('data-verified', 'false');

  // Without the record in DNS, verification fails and the domain stays inactive.
  await page.getByTestId('verify-domain').click();
  await expect(page.getByTestId('verify-error')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('domain-status')).toHaveAttribute('data-verified', 'false');
});

test('an unverified domain does not resolve to the site', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { siteId } = await siteWith(page, `Unverifiziert ${unique('')}`);

  await page.goto(`/sites/${siteId}/plan`);
  await page.getByTestId('switch-to-pro').click();
  await expect(page.getByTestId('plan-notice')).toBeVisible();

  // lvh.me and its subdomains all resolve to localhost, so this host really
  // reaches the app — and must still not be served as this site.
  const domain = `fremd-${unique('')}.lvh.me`;
  await page.goto(`/sites/${siteId}/domain`);
  await page.getByLabel('Eigene Domain').fill(domain);
  await page.getByRole('button', { name: 'Domain speichern' }).click();
  await expect(page.getByTestId('domain-status')).toHaveAttribute('data-verified', 'false');

  const response = await request.get(`http://${domain}:3000/`, { failOnStatusCode: false });
  expect(response.status()).toBe(404);
});

test('the plan page shows usage against the current limits', async ({ page }) => {
  const { siteId } = await siteWith(page, `Nutzung ${unique('')}`);

  await page.goto(`/sites/${siteId}/plan`);
  await expect(page.getByTestId('plan-usage')).toContainText('Inhalte');
  await expect(page.getByTestId('plan-usage')).toContainText('Mitglieder');
  await expect(page.getByTestId('plan-table')).toContainText('Eigene Domain');
});
