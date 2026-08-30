import { createSite, expect, ROOT_DOMAIN, test, unique } from './fixtures';
import type { Page } from '@playwright/test';

async function siteWith(page: Page, name: string) {
  const subdomain = unique('pub');
  await createSite(page, name, subdomain);
  await page.goto('/dashboard');
  await page.getByRole('link', { name }).click();
  await page.waitForURL('**/sites/**');
  return { siteId: page.url().split('/sites/')[1] as string, subdomain };
}

async function publishPost(page: Page, siteId: string, title: string, body: string) {
  await page.goto(`/sites/${siteId}/posts`);
  await page.getByLabel('Titel').fill(title);
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await page.waitForURL('**/posts/**');

  await page.locator('.prose-editor').click();
  await page.keyboard.type(body);
  await expect(page.getByTestId('save-state')).toHaveText('Gespeichert', { timeout: 15_000 });

  await page.getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(page.getByTestId('post-status')).toHaveAttribute('data-status', 'published');
}

test('the home page paginates once there are more posts than fit', async ({ page }) => {
  test.setTimeout(180_000);
  const { siteId, subdomain } = await siteWith(page, `Paginiert ${unique('')}`);

  // POSTS_PER_PAGE is 10, so eleven entries force a second page.
  for (let index = 1; index <= 11; index += 1) {
    await publishPost(page, siteId, `Beitrag Nummer ${index}`, `Inhalt ${index}.`);
  }

  const base = `http://${subdomain}.${ROOT_DOMAIN}`;
  await page.goto(base);
  await expect(page.getByTestId('published-list').locator('li')).toHaveCount(10);
  await expect(page.getByTestId('pagination')).toContainText('Seite 1 von 2');

  await page.getByRole('link', { name: 'Ältere Beiträge →' }).click();
  await expect(page).toHaveURL(`${base}/seite/2`);
  await expect(page.getByTestId('published-list').locator('li')).toHaveCount(1);

  // Page one is the site root, not /seite/1.
  await page.getByRole('link', { name: '← Neuere Beiträge' }).click();
  await expect(page).toHaveURL(`${base}/`);

  // Beyond the last page is a 404, not a silently different page.
  expect((await page.goto(`${base}/seite/99`))?.status()).toBe(404);
});

test('feed, sitemap and robots describe the published content', async ({ page, request }) => {
  const { siteId, subdomain } = await siteWith(page, `Feeds ${unique('')}`);
  await publishPost(page, siteId, 'Im Feed', 'Dieser Beitrag gehört in den Feed.');

  const base = `http://${subdomain}.${ROOT_DOMAIN}`;

  const feed = await request.get(`${base}/feed.xml`);
  expect(feed.headers()['content-type']).toContain('application/rss+xml');
  const feedBody = await feed.text();
  expect(feedBody).toContain('<rss version="2.0"');
  expect(feedBody).toContain('Im Feed');
  expect(feedBody).toContain(`${base}/beitrag/im-feed`);

  const sitemap = await request.get(`${base}/sitemap.xml`);
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain(`<loc>${base}/beitrag/im-feed</loc>`);
  expect(sitemapBody).toContain(`<loc>${base}/archiv</loc>`);

  const robots = await request.get(`${base}/robots.txt`);
  const robotsBody = await robots.text();
  expect(robotsBody).toContain('User-agent: *');
  expect(robotsBody).toContain(`Sitemap: ${base}/sitemap.xml`);
});

test('a post page carries canonical, description and a working og image', async ({
  page,
  request,
}) => {
  const { siteId, subdomain } = await siteWith(page, `Meta ${unique('')}`);
  await publishPost(page, siteId, 'Mit Metadaten', 'Ein Absatz, der zum Auszug wird.');

  const base = `http://${subdomain}.${ROOT_DOMAIN}`;
  const url = `${base}/beitrag/mit-metadaten`;
  await page.goto(url);

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', url);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /zum Auszug wird/,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Mit Metadaten',
  );

  // The og:image must be a public URL, not the internal rewrite target.
  const image = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(image).toBe(`${base}/og/beitrag/mit-metadaten`);
  expect(image).not.toContain('_sites');

  const rendered = await request.get(image as string);
  expect(rendered.status()).toBe(200);
  expect(rendered.headers()['content-type']).toContain('image/png');
});

test('metadata is in the initial head, not streamed into the body', async ({ request }) => {
  // Crawlers outside Next's hardcoded bot list would otherwise see an empty head.
  const response = await request.get('/');
  const html = await response.text();
  const headEnd = html.indexOf('</head>');
  const title = html.indexOf('<title');

  expect(headEnd).toBeGreaterThan(0);
  expect(title).toBeGreaterThan(0);
  expect(title).toBeLessThan(headEnd);
});

test('switching the theme changes the public page', async ({ page }) => {
  const { siteId, subdomain } = await siteWith(page, `Design ${unique('')}`);
  const base = `http://${subdomain}.${ROOT_DOMAIN}`;

  await page.goto(base);
  await expect(page.locator('.site-root')).toHaveAttribute('data-theme', 'minimal');

  await page.goto(`/sites/${siteId}/design`);
  // The radio itself is visually hidden; a user clicks the label around it.
  await page.getByTestId('theme-option-contrast').click();
  await expect(page.getByRole('radio', { name: /Kontrast/ })).toBeChecked();
  await page.getByLabel('Akzent', { exact: true }).fill('#ff8800');
  await page.getByRole('button', { name: 'Design speichern' }).click();
  await expect(page.getByText('Design gespeichert.')).toBeVisible();

  await page.goto(base);
  const root = page.locator('.site-root');
  await expect(root).toHaveAttribute('data-theme', 'contrast');
  await expect(root).toHaveAttribute('style', /--site-accent:\s*#ff8800/);
});

test('the theme form rejects an invalid colour', async ({ page }) => {
  const { siteId } = await siteWith(page, `Ungueltig ${unique('')}`);

  await page.goto(`/sites/${siteId}/design`);
  await page.getByLabel('Akzent', { exact: true }).fill('nicht-hex');
  await page.getByRole('button', { name: 'Design speichern' }).click();

  await expect(page.getByText(/Farbe als Hex-Wert/)).toBeVisible();
});

test('a published post appears without waiting for a cache to expire', async ({ page }) => {
  const { siteId, subdomain } = await siteWith(page, `Cache ${unique('')}`);
  const base = `http://${subdomain}.${ROOT_DOMAIN}`;

  // Warm the cache on the empty site first.
  await page.goto(base);
  await expect(page.getByTestId('no-published')).toBeVisible();

  await publishPost(page, siteId, 'Sofort sichtbar', 'Direkt nach dem Publish da.');

  await page.goto(base);
  await expect(page.getByTestId('published-list')).toContainText('Sofort sichtbar');
});
