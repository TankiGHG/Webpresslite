import { createSite, expect, ROOT_DOMAIN, test, unique } from './fixtures';
import type { Page } from '@playwright/test';

const IMAGE = '/tmp/testbild.jpg';

async function siteWith(page: Page, name: string) {
  const subdomain = unique('med');
  await createSite(page, name, subdomain);
  await page.goto('/dashboard');
  await page.getByRole('link', { name }).click();
  await page.waitForURL('**/sites/**');
  return { siteId: page.url().split('/sites/')[1] as string, subdomain };
}

test('an image is uploaded, processed into variants and listed in the library', async ({
  page,
}) => {
  const { siteId } = await siteWith(page, `Medien ${unique('')}`);

  await page.goto(`/sites/${siteId}/medien`);
  await expect(page.getByTestId('no-media')).toBeVisible();

  await page.getByTestId('media-file-input').setInputFiles(IMAGE);

  const grid = page.getByTestId('media-grid');
  await expect(grid).toBeVisible({ timeout: 30_000 });
  // sharp reports the real dimensions of the original.
  await expect(grid).toContainText('1400×900');
  await expect(grid).toContainText('image/jpeg');

  // The thumbnail is served from storage as a real WebP.
  const thumb = grid.locator('img').first();
  const src = await thumb.getAttribute('src');
  expect(src).toContain('/thumb.webp');

  const response = await page.request.get(src as string);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/webp');
});

test('an alt text is saved and shown again', async ({ page }) => {
  const { siteId } = await siteWith(page, `Alt ${unique('')}`);

  await page.goto(`/sites/${siteId}/medien`);
  await page.getByTestId('media-file-input').setInputFiles(IMAGE);
  await expect(page.getByTestId('media-grid')).toBeVisible({ timeout: 30_000 });

  await page.getByLabel('Alt-Text').fill('Ein blaues Testbild mit Kreis');
  await page.getByRole('button', { name: 'Alt-Text speichern' }).click();
  await expect(page.getByText('Gespeichert.')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Alt-Text')).toHaveValue('Ein blaues Testbild mit Kreis');
});

test('a non image file is rejected before it reaches storage', async ({ page }) => {
  const { siteId } = await siteWith(page, `Ablehnung ${unique('')}`);

  await page.goto(`/sites/${siteId}/medien`);
  await page.getByTestId('media-file-input').setInputFiles({
    name: 'schadcode.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('<script>alert(1)</script>'),
  });

  await expect(page.getByTestId('upload-error')).toContainText('Nur Bilder');
  await expect(page.getByTestId('no-media')).toBeVisible();
});

test('deleting a media entry removes its objects from storage', async ({ page }) => {
  const { siteId } = await siteWith(page, `Loeschen ${unique('')}`);

  await page.goto(`/sites/${siteId}/medien`);
  await page.getByTestId('media-file-input').setInputFiles(IMAGE);
  await expect(page.getByTestId('media-grid')).toBeVisible({ timeout: 30_000 });

  const src = (await page.getByTestId('media-grid').locator('img').first().getAttribute('src'))!;
  expect((await page.request.get(src)).status()).toBe(200);

  await page.getByRole('button', { name: 'Löschen', exact: true }).click();
  await page.getByRole('button', { name: 'Wirklich löschen' }).click();

  await expect(page.getByTestId('no-media')).toBeVisible();

  // The variant is gone from the object store, not just from the list.
  const afterDelete = await page.request.get(src);
  expect(afterDelete.status()).toBe(404);
});

test('an image inserted from the editor is served responsively on the site', async ({ page }) => {
  test.setTimeout(120_000);
  const { siteId, subdomain } = await siteWith(page, `Einbetten ${unique('')}`);

  // Upload first, with an alt text, so the insertion carries it.
  await page.goto(`/sites/${siteId}/medien`);
  await page.getByTestId('media-file-input').setInputFiles(IMAGE);
  await expect(page.getByTestId('media-grid')).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('Alt-Text').fill('Testbild im Beitrag');
  await page.getByRole('button', { name: 'Alt-Text speichern' }).click();
  await expect(page.getByText('Gespeichert.')).toBeVisible();

  // Write a post and insert the image through the picker.
  await page.goto(`/sites/${siteId}/posts`);
  await page.getByLabel('Titel').fill('Beitrag mit Bild');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await page.waitForURL('**/posts/**');

  await page.locator('.prose-editor').click();
  await page.keyboard.type('Text vor dem Bild.');

  await page.getByTestId('insert-image').click();
  await expect(page.getByTestId('media-picker')).toBeVisible();
  await page.getByTestId('picker-item').first().click();

  await expect(page.locator('.prose-editor img')).toBeVisible();
  await expect(page.getByTestId('save-state')).toHaveText('Gespeichert', { timeout: 20_000 });

  await page.getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(page.getByTestId('post-status')).toHaveAttribute('data-status', 'published');

  // The published page carries a real srcset over the generated variants.
  await page.goto(`http://${subdomain}.${ROOT_DOMAIN}/beitrag/beitrag-mit-bild`);
  const image = page.getByTestId('post-content').locator('img');
  await expect(image).toBeVisible();

  await expect(image).toHaveAttribute('alt', 'Testbild im Beitrag');
  await expect(image).toHaveAttribute('loading', 'lazy');
  await expect(image).toHaveAttribute('sizes', /44rem/);

  const srcset = (await image.getAttribute('srcset')) ?? '';
  expect(srcset).toContain('thumb.webp 320w');
  expect(srcset).toContain('medium.webp 800w');
  expect(srcset).toContain('full.webp 1400w');

  // Every variant the srcset promises actually exists.
  for (const entry of srcset.split(',')) {
    const url = entry.trim().split(' ')[0] as string;
    const response = await page.request.get(url);
    expect(response.status(), url).toBe(200);
    expect(response.headers()['content-type']).toBe('image/webp');
  }

  // The browser picked one of them for the current viewport.
  const chosen = await image.evaluate((element) => (element as HTMLImageElement).currentSrc);
  expect(chosen).toContain('.webp');
});
