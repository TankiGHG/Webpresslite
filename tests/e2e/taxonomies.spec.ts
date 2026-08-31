import { createSite, expect, ROOT_DOMAIN, test, unique } from './fixtures';
import type { Page } from '@playwright/test';

async function siteWith(page: Page, name: string) {
  const subdomain = unique('tax');
  await createSite(page, name, subdomain);
  await page.goto('/dashboard');
  await page.getByRole('link', { name }).click();
  await page.waitForURL('**/sites/**');
  return { siteId: page.url().split('/sites/')[1] as string, subdomain };
}

async function writePost(page: Page, siteId: string, title: string, body: string) {
  await page.goto(`/sites/${siteId}/posts`);
  await page.getByLabel('Titel').fill(title);
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await page.waitForURL('**/posts/**');
  const postId = page.url().split('/posts/')[1] as string;

  await page.locator('.prose-editor').click();
  await page.keyboard.type(body);
  await expect(page.getByTestId('save-state')).toHaveText('Gespeichert', { timeout: 20_000 });

  return postId;
}

async function publish(page: Page) {
  await page.getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(page.getByTestId('post-status')).toHaveAttribute('data-status', 'published');
}

test('a category and tags drive their archive pages', async ({ page }) => {
  test.setTimeout(120_000);
  const { siteId, subdomain } = await siteWith(page, `Taxonomien ${unique('')}`);
  const base = `http://${subdomain}.${ROOT_DOMAIN}`;

  await page.goto(`/sites/${siteId}/taxonomien`);
  await expect(page.getByTestId('no-categories')).toBeVisible();
  await page.getByLabel('Neue Kategorie').fill('Reisen');
  await page.getByLabel('Beschreibung').fill('Unterwegs gewesen');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.getByTestId('category-list')).toContainText('Reisen');

  await writePost(page, siteId, 'Ein Wochenende in Bremen', 'Bericht aus dem Norden.');
  await page.getByLabel('Kategorie').selectOption({ label: 'Reisen' });
  await page.getByLabel('Tags (durch Komma getrennt)').fill('Norden, Kurztrip');
  await page.getByRole('button', { name: 'Einordnung speichern' }).click();
  await expect(page.getByText('Einordnung gespeichert.')).toBeVisible();
  await publish(page);

  // Tags were created on the fly.
  await page.goto(`/sites/${siteId}/taxonomien`);
  await expect(page.getByTestId('tag-list')).toContainText('Norden');
  await expect(page.getByTestId('tag-list')).toContainText('Kurztrip');

  // The post links to both archives, and both list it.
  await page.goto(`${base}/beitrag/ein-wochenende-in-bremen`);
  await expect(page.getByTestId('post-taxonomies')).toContainText('Reisen');
  await expect(page.getByTestId('post-taxonomies')).toContainText('#Norden');

  await page.getByRole('link', { name: 'Reisen' }).click();
  await expect(page).toHaveURL(`${base}/kategorie/reisen`);
  await expect(page.getByTestId('archive-title')).toHaveText('Reisen');
  await expect(page.getByTestId('published-list')).toContainText('Ein Wochenende in Bremen');

  await page.goto(`${base}/tag/norden`);
  await expect(page.getByTestId('archive-title')).toHaveText('Tag: Norden');
  await expect(page.getByTestId('published-list')).toContainText('Ein Wochenende in Bremen');
});

test('an unpublished post does not show up in its archives', async ({ page }) => {
  test.setTimeout(120_000);
  const { siteId, subdomain } = await siteWith(page, `Entwurf ${unique('')}`);
  const base = `http://${subdomain}.${ROOT_DOMAIN}`;

  await page.goto(`/sites/${siteId}/taxonomien`);
  await page.getByLabel('Neue Kategorie').fill('Intern');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.getByTestId('category-list')).toContainText('Intern');

  await writePost(page, siteId, 'Noch geheim', 'Steht noch nicht fest.');
  await page.getByLabel('Kategorie').selectOption({ label: 'Intern' });
  await page.getByRole('button', { name: 'Einordnung speichern' }).click();
  await expect(page.getByText('Einordnung gespeichert.')).toBeVisible();

  // The category exists but has nothing published, so the archive is empty.
  await page.goto(`${base}/kategorie/intern`);
  await expect(page.getByTestId('empty-archive')).toBeVisible();
});

test('full text search finds a post and ignores drafts', async ({ page }) => {
  test.setTimeout(120_000);
  const { siteId, subdomain } = await siteWith(page, `Suche ${unique('')}`);
  const base = `http://${subdomain}.${ROOT_DOMAIN}`;

  await writePost(page, siteId, 'Gartenarbeit im Herbst', 'Laub harken und Beete abdecken.');
  await publish(page);

  await writePost(page, siteId, 'Unveroeffentlicht', 'Hier steht Laub, aber als Entwurf.');

  await page.goto(`${base}/suche?q=Laub`);
  await expect(page.getByTestId('search-results')).toContainText('Gartenarbeit im Herbst');
  await expect(page.getByTestId('search-results')).not.toContainText('Unveroeffentlicht');

  // The match is highlighted in the snippet.
  await expect(page.getByTestId('search-results').locator('mark').first()).toBeVisible();

  // A term that appears nowhere returns nothing rather than everything.
  await page.goto(`${base}/suche?q=Quantenchromodynamik`);
  await expect(page.getByTestId('no-results')).toBeVisible();

  // Searching over the form works too.
  await page.goto(`${base}/suche`);
  await page.getByLabel('Suchbegriff').fill('Gartenarbeit');
  await page.getByRole('button', { name: 'Suchen' }).click();
  await expect(page.getByTestId('search-results')).toContainText('Gartenarbeit im Herbst');
});

test('search does not reach into another site', async ({ page }) => {
  test.setTimeout(120_000);
  const first = await siteWith(page, `SucheA ${unique('')}`);
  await writePost(page, first.siteId, 'Geheimwort Kaktusblume', 'Nur auf dieser Site.');
  await publish(page);

  const second = await siteWith(page, `SucheB ${unique('')}`);
  await writePost(page, second.siteId, 'Etwas ganz anderes', 'Ohne das Wort.');
  await publish(page);

  await page.goto(`http://${second.subdomain}.${ROOT_DOMAIN}/suche?q=Kaktusblume`);
  await expect(page.getByTestId('no-results')).toBeVisible();

  await page.goto(`http://${first.subdomain}.${ROOT_DOMAIN}/suche?q=Kaktusblume`);
  await expect(page.getByTestId('search-results')).toContainText('Geheimwort Kaktusblume');
});
