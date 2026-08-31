import { createSite, expect, ROOT_DOMAIN, test, unique } from './fixtures';
import type { Page } from '@playwright/test';

async function siteWithPost(page: Page, name: string) {
  const subdomain = unique('com');
  await createSite(page, name, subdomain);
  await page.goto('/dashboard');
  await page.getByRole('link', { name }).click();
  await page.waitForURL('**/sites/**');
  const siteId = page.url().split('/sites/')[1] as string;

  await page.goto(`/sites/${siteId}/posts`);
  await page.getByLabel('Titel').fill('Beitrag mit Kommentaren');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await page.waitForURL('**/posts/**');

  await page.locator('.prose-editor').click();
  await page.keyboard.type('Sag mir deine Meinung.');
  await expect(page.getByTestId('save-state')).toHaveText('Gespeichert', { timeout: 20_000 });

  await page.getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(page.getByTestId('post-status')).toHaveAttribute('data-status', 'published');

  return {
    siteId,
    subdomain,
    url: `http://${subdomain}.${ROOT_DOMAIN}/beitrag/beitrag-mit-kommentaren`,
  };
}

async function writeComment(page: Page, name: string, body: string) {
  await page.getByLabel('Name').fill(name);
  await page
    .getByLabel('E-Mail (wird nicht veröffentlicht)')
    .fill(`${unique('leser-')}@example.com`);
  await page.getByLabel('Kommentar').fill(body);
  await page.getByRole('button', { name: 'Kommentar absenden' }).click();
  await expect(page.getByTestId('comment-submitted')).toBeVisible();
}

test('a comment is only public after it has been approved', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const { siteId, url } = await siteWithPost(page, `Kommentare ${unique('')}`);

  // A visitor without a session writes a comment.
  const visitorContext = await browser.newContext({ storageState: undefined });
  const visitor = await visitorContext.newPage();
  await visitor.goto(url);
  await writeComment(visitor, 'Neugierige Leserin', 'Das war ein guter Beitrag, danke!');

  // It is not on the page yet, not even after a reload.
  await visitor.reload();
  await expect(visitor.getByTestId('comment-list')).toHaveCount(0);
  await expect(visitor.getByTestId('comments')).toContainText('Kommentare');
  await expect(visitor.getByTestId('comments')).not.toContainText('Das war ein guter Beitrag');

  // The moderator sees it in the pending queue.
  await page.goto(`/sites/${siteId}/kommentare`);
  const entry = page.getByTestId('moderation-list').locator('li').first();
  await expect(entry).toContainText('Neugierige Leserin');
  await expect(entry).toHaveAttribute('data-status', 'pending');

  await entry.getByRole('button', { name: 'Freigeben' }).click();
  await expect(page.getByTestId('no-comments')).toBeVisible();

  // Now, and only now, it is public.
  await visitor.reload();
  await expect(visitor.getByTestId('comment-list')).toContainText('Das war ein guter Beitrag');
  await expect(visitor.getByTestId('comments')).toContainText('1 Kommentar');

  // Withdrawing the approval hides it again.
  await page.goto(`/sites/${siteId}/kommentare?status=approved`);
  await page
    .getByTestId('moderation-list')
    .locator('li')
    .first()
    .getByRole('button', { name: 'Freigabe zurücknehmen' })
    .click();

  // Wait for the moderation view to reflect the change, otherwise the reload
  // below can race the server action.
  await expect(page.getByTestId('no-comments')).toBeVisible();

  await visitor.reload();
  await expect(visitor.getByTestId('comment-list')).toHaveCount(0);

  await visitorContext.close();
});

test('the honeypot swallows a bot without telling it', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const { siteId, url } = await siteWithPost(page, `Honeypot ${unique('')}`);

  const botContext = await browser.newContext({ storageState: undefined });
  const bot = await botContext.newPage();
  await bot.goto(url);

  // Fill the hidden field, as an automated client would.
  await bot.locator('input[name="website"]').fill('https://spam.example');
  await bot.getByLabel('Name').fill('Bot');
  await bot.getByLabel('E-Mail (wird nicht veröffentlicht)').fill('bot@example.com');
  await bot.getByLabel('Kommentar').fill('Billige Uhren hier klicken.');
  await bot.getByRole('button', { name: 'Kommentar absenden' }).click();

  // The bot sees exactly what a person sees, so it learns nothing.
  await expect(bot.getByTestId('comment-submitted')).toBeVisible();

  // But nothing was stored, in any queue.
  for (const status of ['pending', 'approved', 'spam']) {
    await page.goto(`/sites/${siteId}/kommentare?status=${status}`);
    await expect(page.getByTestId('no-comments'), status).toBeVisible();
  }

  await botContext.close();
});

test('an obvious spam comment lands in the spam queue, never on the page', async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const { siteId, url } = await siteWithPost(page, `Spam ${unique('')}`);

  const spammerContext = await browser.newContext({ storageState: undefined });
  const spammer = await spammerContext.newPage();
  await spammer.goto(url);
  await writeComment(
    spammer,
    'Guenstig',
    'https://a.example https://b.example https://c.example https://d.example',
  );

  await spammer.reload();
  await expect(spammer.getByTestId('comment-list')).toHaveCount(0);

  await page.goto(`/sites/${siteId}/kommentare?status=pending`);
  await expect(page.getByTestId('no-comments')).toBeVisible();

  await page.goto(`/sites/${siteId}/kommentare?status=spam`);
  await expect(page.getByTestId('moderation-list')).toContainText('Guenstig');

  await spammerContext.close();
});

test('the comment form rejects incomplete input', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const { url } = await siteWithPost(page, `Validierung ${unique('')}`);

  const visitorContext = await browser.newContext({ storageState: undefined });
  const visitor = await visitorContext.newPage();
  await visitor.goto(url);

  // Bypass the browser's own required checks to reach the server validation.
  await visitor.locator('form[data-testid="comment-form"]').evaluate((form) => {
    form.setAttribute('novalidate', 'novalidate');
  });

  await visitor.getByLabel('Name').fill('A');
  await visitor.getByLabel('E-Mail (wird nicht veröffentlicht)').fill('keine-adresse');
  await visitor.getByLabel('Kommentar').fill('x');
  await visitor.getByRole('button', { name: 'Kommentar absenden' }).click();

  await expect(
    visitor.getByText('Bitte gib einen Namen mit mindestens 2 Zeichen ein.'),
  ).toBeVisible();
  await expect(
    visitor.getByText('Das sieht nicht nach einer gültigen E-Mail-Adresse aus.'),
  ).toBeVisible();

  await visitorContext.close();
});
