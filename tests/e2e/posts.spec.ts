import { createSite, expect, ROOT_DOMAIN, test, unique } from './fixtures';

async function createPost(page: import('@playwright/test').Page, siteId: string, title: string) {
  await page.goto(`/sites/${siteId}/posts`);
  await page.getByLabel('Titel').fill(title);
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await page.waitForURL('**/posts/**');
  return page.url().split('/posts/')[1] as string;
}

async function siteWith(page: import('@playwright/test').Page, name: string) {
  const subdomain = unique('posts');
  await createSite(page, name, subdomain);
  await page.goto('/dashboard');
  await page.getByRole('link', { name }).click();
  await page.waitForURL('**/sites/**');
  const siteId = page.url().split('/sites/')[1] as string;
  return { siteId, subdomain };
}

test('a post is written, autosaved, published and served publicly', async ({ page }) => {
  const { siteId, subdomain } = await siteWith(page, `Blog ${unique('')}`);
  const postId = await createPost(page, siteId, 'Mein erster Beitrag');

  // Type into the editor and let the debounced autosave run.
  await page.locator('.prose-editor').click();
  await page.keyboard.type('Hallo aus dem Editor.');
  await expect(page.getByTestId('save-state')).toHaveText('Gespeichert', { timeout: 15_000 });

  // The content survives a reload, so it really went to the database.
  await page.reload();
  await expect(page.locator('.prose-editor')).toContainText('Hallo aus dem Editor.');

  // Draft is not public yet.
  const draftResponse = await page.goto(
    `http://${subdomain}.${ROOT_DOMAIN}/beitrag/mein-erster-beitrag`,
  );
  expect(draftResponse?.status()).toBe(404);

  // Publish it.
  await page.goto(`/sites/${siteId}/posts/${postId}`);
  await page.getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(page.getByTestId('post-status')).toHaveAttribute('data-status', 'published');

  // Now it is served under the tenant subdomain.
  await page.goto(`http://${subdomain}.${ROOT_DOMAIN}/beitrag/mein-erster-beitrag`);
  await expect(page.getByTestId('post-title')).toHaveText('Mein erster Beitrag');
  await expect(page.getByTestId('post-content')).toContainText('Hallo aus dem Editor.');

  // And listed on the site's home page.
  await page.goto(`http://${subdomain}.${ROOT_DOMAIN}/`);
  await expect(page.getByTestId('published-list')).toContainText('Mein erster Beitrag');
});

test('the preview shows a draft that is not public yet', async ({ page }) => {
  const { siteId, subdomain } = await siteWith(page, `Vorschau ${unique('')}`);
  const postId = await createPost(page, siteId, 'Nur ein Entwurf');

  await page.locator('.prose-editor').click();
  await page.keyboard.type('Geheimer Entwurfstext.');
  await expect(page.getByTestId('save-state')).toHaveText('Gespeichert', { timeout: 15_000 });

  await page.goto(`/sites/${siteId}/posts/${postId}/preview`);
  await expect(page.getByTestId('preview-title')).toHaveText('Nur ein Entwurf');
  await expect(page.getByTestId('post-content')).toContainText('Geheimer Entwurfstext.');

  const publicResponse = await page.goto(
    `http://${subdomain}.${ROOT_DOMAIN}/beitrag/nur-ein-entwurf`,
  );
  expect(publicResponse?.status()).toBe(404);
});

test('a scheduled post is published automatically once it is due', async ({ page, request }) => {
  // The point of this test is the wait: the post must go live on its own.
  test.setTimeout(180_000);

  const { siteId, subdomain } = await siteWith(page, `Geplant ${unique('')}`);
  const postId = await createPost(page, siteId, 'Geplanter Beitrag');

  await page.locator('.prose-editor').click();
  await page.keyboard.type('Erscheint automatisch.');
  await expect(page.getByTestId('save-state')).toHaveText('Gespeichert', { timeout: 15_000 });

  // The form only accepts a future moment, so schedule just past the next minute.
  const due = new Date(Date.now() + 65_000);
  const local = new Date(due.getTime() - due.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

  await page.goto(`/sites/${siteId}/posts/${postId}`);
  await page.getByLabel('Später veröffentlichen').fill(local);
  await page.getByRole('button', { name: 'Veröffentlichung planen' }).click();
  await expect(page.getByTestId('post-status')).toHaveAttribute('data-status', 'scheduled');

  const url = `http://${subdomain}.${ROOT_DOMAIN}/beitrag/geplanter-beitrag`;
  const secret = process.env.CRON_SECRET ?? '';

  // Not public yet, and a cron run before the due moment leaves it alone.
  expect((await page.goto(url))?.status()).toBe(404);

  const early = await request.post('/api/cron/publish-scheduled', {
    headers: { authorization: `Bearer ${secret}` },
  });
  expect(early.ok()).toBe(true);
  expect((await early.json()).posts).not.toContain(postId);
  expect((await page.goto(url))?.status()).toBe(404);

  // Wait for the moment to pass, then let the scheduler do its work.
  let publishedIds: string[] = [];
  for (let attempt = 0; attempt < 20 && !publishedIds.includes(postId); attempt += 1) {
    await page.waitForTimeout(5_000);
    const run = await request.post('/api/cron/publish-scheduled', {
      headers: { authorization: `Bearer ${secret}` },
    });
    expect(run.ok()).toBe(true);
    publishedIds = (await run.json()).posts as string[];
  }

  expect(publishedIds).toContain(postId);

  // It is live now, without anybody pressing publish.
  const response = await page.goto(url);
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId('post-title')).toHaveText('Geplanter Beitrag');
  await expect(page.getByTestId('post-content')).toContainText('Erscheint automatisch.');

  await page.goto(`/sites/${siteId}/posts/${postId}`);
  await expect(page.getByTestId('post-status')).toHaveAttribute('data-status', 'published');
});

test('the cron endpoint refuses a wrong or missing secret', async ({ request }) => {
  const withoutSecret = await request.post('/api/cron/publish-scheduled');
  expect(withoutSecret.status()).toBe(401);

  const wrongSecret = await request.post('/api/cron/publish-scheduled', {
    headers: { authorization: 'Bearer definitely-not-the-secret' },
  });
  expect(wrongSecret.status()).toBe(401);
});

test('slugs stay unique within a site', async ({ page }) => {
  const { siteId } = await siteWith(page, `Slugs ${unique('')}`);

  await createPost(page, siteId, 'Gleicher Titel');
  await createPost(page, siteId, 'Gleicher Titel');

  await page.goto(`/sites/${siteId}/posts`);
  await expect(page.getByTestId('post-list')).toContainText('gleicher-titel');
  await expect(page.getByTestId('post-list')).toContainText('gleicher-titel-2');
});

test('a page is served without the beitrag prefix', async ({ page }) => {
  const { siteId, subdomain } = await siteWith(page, `Seiten ${unique('')}`);

  await page.goto(`/sites/${siteId}/posts`);
  await page.getByLabel('Titel').fill('Impressum');
  await page.getByLabel('Art').selectOption('page');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await page.waitForURL('**/posts/**');

  await page.locator('.prose-editor').click();
  await page.keyboard.type('Angaben nach Paragraf 5.');
  await expect(page.getByTestId('save-state')).toHaveText('Gespeichert', { timeout: 15_000 });

  await page.getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(page.getByTestId('post-status')).toHaveAttribute('data-status', 'published');

  await page.goto(`http://${subdomain}.${ROOT_DOMAIN}/impressum`);
  await expect(page.getByTestId('page-title')).toHaveText('Impressum');
});
