import { baseURLOf, createSite, expect, registerUser, test, unique } from './fixtures';
import type { Page } from '@playwright/test';

async function siteWith(page: Page, name: string) {
  const subdomain = unique('team');
  await createSite(page, name, subdomain);
  await page.goto('/dashboard');
  await page.getByRole('link', { name }).click();
  await page.waitForURL('**/sites/**');
  return { siteId: page.url().split('/sites/')[1] as string, subdomain };
}

/**
 * Registers a second person and walks them through an invitation, returning a
 * page that is signed in as the new member.
 */
async function inviteAndAccept(
  owner: Page,
  browser: import('@playwright/test').Browser,
  siteId: string,
  role: 'Redaktion' | 'Autor:in' | 'Administration',
) {
  const context = await browser.newContext({
    storageState: undefined,
    baseURL: baseURLOf(test.info()),
  });
  const member = await context.newPage();
  const email = await registerUser(member);

  await owner.goto(`/sites/${siteId}/team`);
  await owner.getByLabel('E-Mail').fill(email);
  await owner.getByLabel('Rolle').selectOption({ label: role });
  await owner.getByRole('button', { name: 'Einladen' }).click();
  await expect(owner.getByText(`Einladung an ${email} verschickt.`)).toBeVisible();

  // The invitation link is only in the mail, which the dev setup logs.
  const token = await readInvitationToken(email);
  await member.goto(`/einladung/${token}`);
  await member.getByTestId('accept-invitation').click();
  await member.waitForURL('**/sites/**');

  return { context, member, email };
}

/** Pulls the newest invitation token for an address out of the server log. */
async function readInvitationToken(email: string): Promise<string> {
  const { readFileSync } = await import('node:fs');
  const log = readFileSync('/tmp/prod.log', 'utf8');
  const blocks = log.split('[mail]').filter((block) => block.includes(email));
  const last = blocks.at(-1) ?? '';
  const match = last.match(/\/einladung\/([A-Za-z0-9_-]+)/);

  if (!match?.[1]) throw new Error(`No invitation link for ${email} in the log.`);
  return match[1];
}

test('an editor may write but cannot change site settings', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const { siteId } = await siteWith(page, `Redaktion ${unique('')}`);

  const { context, member } = await inviteAndAccept(page, browser, siteId, 'Redaktion');

  // The editor sees the site and may work on content.
  await member.goto(`/sites/${siteId}`);
  await expect(member.getByTestId('site-role')).toHaveText('Redaktion');

  await member.goto(`/sites/${siteId}/posts`);
  await member.getByLabel('Titel').fill('Beitrag der Redaktion');
  await member.getByRole('button', { name: 'Anlegen' }).click();
  await member.waitForURL('**/posts/**');

  await member.locator('.prose-editor').click();
  await member.keyboard.type('Von der Redaktion geschrieben.');
  await expect(member.getByTestId('save-state')).toHaveText('Gespeichert', { timeout: 20_000 });

  // An editor may publish.
  await member.getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(member.getByTestId('post-status')).toHaveAttribute('data-status', 'published');

  // But the site settings are out of reach — not shown, and not reachable.
  await expect(member.getByRole('link', { name: 'Design anpassen' })).toHaveCount(0);
  await member.goto(`/sites/${siteId}`);
  await expect(member.getByRole('link', { name: 'Team verwalten' })).toHaveCount(0);
  await expect(member.getByRole('link', { name: 'Domain verwalten' })).toHaveCount(0);
  await expect(member.getByRole('link', { name: 'Plan ansehen' })).toHaveCount(0);
  await expect(member.getByRole('button', { name: 'Site löschen' })).toHaveCount(0);

  for (const path of ['design', 'team', 'domain', 'plan']) {
    const response = await member.goto(`/sites/${siteId}/${path}`);
    expect(response?.status(), path).toBe(404);
  }

  // What an editor *is* allowed to do stays available.
  expect((await member.goto(`/sites/${siteId}/statistik`))?.status()).toBe(200);
  expect((await member.goto(`/sites/${siteId}/kommentare`))?.status()).toBe(200);
  expect((await member.goto(`/sites/${siteId}/taxonomien`))?.status()).toBe(200);

  await context.close();
});

test('an author may write but not publish', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const { siteId } = await siteWith(page, `Autor ${unique('')}`);

  const { context, member } = await inviteAndAccept(page, browser, siteId, 'Autor:in');

  await member.goto(`/sites/${siteId}/posts`);
  await member.getByLabel('Titel').fill('Entwurf einer Autorin');
  await member.getByRole('button', { name: 'Anlegen' }).click();
  await member.waitForURL('**/posts/**');

  await member.locator('.prose-editor').click();
  await member.keyboard.type('Wartet auf die Redaktion.');
  await expect(member.getByTestId('save-state')).toHaveText('Gespeichert', { timeout: 20_000 });

  // No publish control, and the moderation surfaces stay closed.
  await expect(member.getByTestId('cannot-publish')).toBeVisible();
  await expect(member.getByRole('button', { name: 'Jetzt veröffentlichen' })).toHaveCount(0);
  await expect(member.getByRole('button', { name: 'Beitrag löschen' })).toHaveCount(0);

  expect((await member.goto(`/sites/${siteId}/kommentare`))?.status()).toBe(404);
  expect((await member.goto(`/sites/${siteId}/statistik`))?.status()).toBe(404);

  await context.close();
});

test('an invitation is bound to the address it was sent to', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const { siteId } = await siteWith(page, `Bindung ${unique('')}`);

  const invitedEmail = `${unique('eingeladen-')}@example.com`;
  await page.goto(`/sites/${siteId}/team`);
  await page.getByLabel('E-Mail').fill(invitedEmail);
  await page.getByLabel('Rolle').selectOption({ label: 'Redaktion' });
  await page.getByRole('button', { name: 'Einladen' }).click();
  await expect(page.getByText(`Einladung an ${invitedEmail} verschickt.`)).toBeVisible();

  const token = await readInvitationToken(invitedEmail);

  // Somebody else, with the link but a different account, gets nowhere.
  const context = await browser.newContext({
    storageState: undefined,
    baseURL: baseURLOf(test.info()),
  });
  const intruder = await context.newPage();
  await registerUser(intruder);

  await intruder.goto(`/einladung/${token}`);
  await expect(intruder.getByText(/wurde an/)).toBeVisible();
  await expect(intruder.getByTestId('accept-invitation')).toHaveCount(0);

  // And the site stays out of reach.
  expect((await intruder.goto(`/sites/${siteId}`))?.status()).toBe(404);

  await context.close();
});

test('the owner can change a role and remove a member', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const { siteId } = await siteWith(page, `Rollen ${unique('')}`);

  const { context, member, email } = await inviteAndAccept(page, browser, siteId, 'Autor:in');

  // Promote to editor.
  await page.goto(`/sites/${siteId}/team`);
  const row = page.getByTestId('member').filter({ hasText: email });
  await row.getByRole('combobox').selectOption({ label: 'Redaktion' });
  await row.getByRole('button', { name: 'Rolle setzen' }).click();
  await expect(row.getByText('Rolle geändert.')).toBeVisible();

  await member.goto(`/sites/${siteId}`);
  await expect(member.getByTestId('site-role')).toHaveText('Redaktion');

  // Remove them again.
  await page.goto(`/sites/${siteId}/team`);
  await page
    .getByTestId('member')
    .filter({ hasText: email })
    .getByRole('button', { name: 'Entfernen' })
    .click();
  await expect(page.getByTestId('member-list')).not.toContainText(email);

  expect((await member.goto(`/sites/${siteId}`))?.status()).toBe(404);

  await context.close();
});

test('the owner cannot be demoted or removed', async ({ page }) => {
  const { siteId } = await siteWith(page, `Eigentum ${unique('')}`);

  await page.goto(`/sites/${siteId}/team`);
  const ownerRow = page.getByTestId('member').first();

  // The owner row offers no controls at all.
  await expect(ownerRow.getByRole('button', { name: 'Entfernen' })).toHaveCount(0);
  await expect(ownerRow.getByRole('combobox')).toHaveCount(0);
  await expect(ownerRow).toContainText('Eigentümer:in');
});

test('the permission matrix is on the page, not just in the code', async ({ page }) => {
  const { siteId } = await siteWith(page, `Matrix ${unique('')}`);

  await page.goto(`/sites/${siteId}/team`);
  const matrix = page.getByTestId('permission-matrix');

  await expect(matrix).toContainText('Veröffentlichen');
  await expect(matrix).toContainText('Site-Einstellungen ändern');
  await expect(matrix).toContainText('Eigentümer:in');
});
