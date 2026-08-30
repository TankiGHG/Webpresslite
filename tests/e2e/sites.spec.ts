import { baseURLOf, createSite, expect, registerUser, ROOT_DOMAIN, test, unique } from './fixtures';

test('two sites are served in parallel under their own subdomains', async ({ page }) => {
  const first = unique('alpha');
  const second = unique('beta');

  await createSite(page, 'Alpha Blog', first);
  await createSite(page, 'Beta Blog', second);

  // The header names the site, so it proves which tenant answered each host.
  await page.goto(`http://${first}.${ROOT_DOMAIN}/`);
  await expect(page.getByTestId('site-name')).toHaveText('Alpha Blog');

  await page.goto(`http://${second}.${ROOT_DOMAIN}/`);
  await expect(page.getByTestId('site-name')).toHaveText('Beta Blog');
});

test('an unknown subdomain is a 404, not somebody elses site', async ({ page }) => {
  const response = await page.goto(`http://${unique('nope')}.${ROOT_DOMAIN}/`);

  expect(response?.status()).toBe(404);
});

test('a tenant host does not serve the platform dashboard', async ({ page }) => {
  const subdomain = unique('walled');
  await createSite(page, 'Abgeschottet', subdomain);

  // The tenant host has no /dashboard route of its own; it must not fall
  // through to the platform one, session or not.
  const response = await page.goto(`http://${subdomain}.${ROOT_DOMAIN}/dashboard`);
  expect(response?.status()).toBe(404);
  await expect(page.getByTestId('site-list')).toHaveCount(0);
});

test('cross-tenant access from the dashboard fails', async ({ page, browser }) => {
  const subdomain = unique('owned');
  await createSite(page, 'Fremde Site', subdomain);

  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Fremde Site' }).click();
  await page.waitForURL('**/sites/**');
  const siteId = page.url().split('/sites/')[1];
  expect(siteId).toBeTruthy();

  // A second, unrelated user must not reach that site by its id.
  const intruderContext = await browser.newContext({
    storageState: undefined,
    baseURL: baseURLOf(test.info()),
  });
  const intruderPage = await intruderContext.newPage();
  await registerUser(intruderPage);

  const response = await intruderPage.goto(`/sites/${siteId}`);
  expect(response?.status()).toBe(404);
  await expect(intruderPage.getByTestId('site-detail-name')).toHaveCount(0);

  // The intruder's own dashboard stays empty.
  await intruderPage.goto('/dashboard');
  await expect(intruderPage.getByTestId('no-sites')).toBeVisible();

  await intruderContext.close();
});

test('the subdomain form rejects reserved and taken names', async ({ page }) => {
  const taken = unique('taken');
  await createSite(page, 'Belegte Site', taken);

  await page.goto('/dashboard');
  await page.getByLabel('Name der Site').fill('Noch eine Site');
  await page.getByLabel('Subdomain').fill('www');
  await expect(page.getByTestId('subdomain-availability')).toHaveText(
    'Diese Subdomain ist reserviert.',
  );

  await page.getByLabel('Subdomain').fill(taken);
  await expect(page.getByTestId('subdomain-availability')).toHaveText('Schon vergeben.');

  // The unique index, not the availability check, is what actually decides.
  await page.getByRole('button', { name: 'Site anlegen' }).click();
  await expect(page.getByText('Diese Subdomain ist schon vergeben.')).toBeVisible();
});

test('the owner can delete a site and its subdomain stops resolving', async ({ page }) => {
  const subdomain = unique('temp');
  await createSite(page, 'Temporaere Site', subdomain);

  const before = await page.goto(`http://${subdomain}.${ROOT_DOMAIN}/`);
  expect(before?.status()).toBe(200);

  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Temporaere Site' }).click();
  await page.getByRole('button', { name: 'Site löschen' }).click();
  await page.getByLabel('Bestätigung').fill(subdomain);
  await page.getByRole('button', { name: 'Endgültig löschen' }).click();

  await page.waitForURL('**/dashboard');
  await expect(page.getByRole('link', { name: 'Temporaere Site' })).toHaveCount(0);

  const after = await page.goto(`http://${subdomain}.${ROOT_DOMAIN}/`);
  expect(after?.status()).toBe(404);
});
