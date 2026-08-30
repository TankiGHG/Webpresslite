import { expect, test, type Page } from '@playwright/test';

/** Next's route announcer also carries `role="alert"`, so scope to the form. */
function formAlert(page: Page) {
  return page.locator('form').getByRole('alert');
}

function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

const PASSWORD = 'correct-horse-battery';

async function register(page: Page, email: string, name = 'E2E Nutzer') {
  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('E-Mail').fill(email);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Konto anlegen' }).click();
  await page.waitForURL('**/dashboard');
}

test('registration, login, protected page and logout', async ({ page }) => {
  const email = uniqueEmail();

  // Register -> lands on the dashboard with an active session.
  await register(page, email);
  await expect(page.getByTestId('session-email')).toHaveText(email);

  // Log out -> the protected page must no longer be reachable.
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await page.waitForURL('**/login');

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard/);

  // Log back in -> redirected to the page that was requested.
  await page.getByLabel('E-Mail').fill(email);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.waitForURL('**/dashboard');
  await expect(page.getByTestId('session-email')).toHaveText(email);

  // The profile page is protected too and shows the same account.
  await page.goto('/profile');
  await expect(page.getByTestId('profile-email')).toHaveText(email);
});

test('wrong password is rejected without revealing whether the account exists', async ({
  page,
}) => {
  const email = uniqueEmail();
  await register(page, email);
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await page.waitForURL('**/login');

  await page.getByLabel('E-Mail').fill(email);
  await page.getByLabel('Passwort').fill('definitely-wrong-password');
  await page.getByRole('button', { name: 'Anmelden' }).click();

  await expect(formAlert(page)).toHaveText('E-Mail-Adresse oder Passwort ist falsch.');
  await expect(page).toHaveURL(/\/login/);

  // An unknown address produces exactly the same message.
  await page.getByLabel('E-Mail').fill(uniqueEmail());
  await page.getByLabel('Passwort').fill('definitely-wrong-password');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(formAlert(page)).toHaveText('E-Mail-Adresse oder Passwort ist falsch.');
});

test('signed-in users are kept away from the auth pages', async ({ page }) => {
  await register(page, uniqueEmail());

  await page.goto('/login');
  await expect(page).toHaveURL(/\/dashboard/);
});

test('the password reset form never reveals whether an address is known', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('E-Mail').fill(uniqueEmail());
  await page.getByRole('button', { name: 'Link zum Zurücksetzen senden' }).click();

  await expect(page.getByRole('status')).toContainText('Wenn es zu dieser Adresse ein Konto gibt');
});
