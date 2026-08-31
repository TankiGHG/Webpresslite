import { expect, test } from './fixtures';

const REQUIRED = [
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'strict-transport-security',
];

test('every response carries the security headers', async ({ request }) => {
  for (const path of ['/', '/login', '/api/health']) {
    const response = await request.get(path, { failOnStatusCode: false });
    const headers = response.headers();

    for (const name of REQUIRED) {
      expect(headers[name], `${path} is missing ${name}`).toBeTruthy();
    }
  }
});

test('the policy is strict and carries a fresh nonce per request', async ({ request }) => {
  const first = (await request.get('/')).headers()['content-security-policy'] ?? '';
  const second = (await request.get('/')).headers()['content-security-policy'] ?? '';

  expect(first).toContain("default-src 'self'");
  expect(first).toContain("frame-ancestors 'none'");
  expect(first).toContain("object-src 'none'");
  expect(first).toMatch(/script-src [^;]*'nonce-/);

  // A nonce that repeats is no better than none at all.
  const nonceOf = (csp: string) => csp.match(/'nonce-([^']+)'/)?.[1];
  expect(nonceOf(first)).toBeTruthy();
  expect(nonceOf(first)).not.toBe(nonceOf(second));
});

test('the pages load with no policy violation', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) {
      violations.push(message.text().slice(0, 200));
    }
  });
  page.on('pageerror', (error) => violations.push(`pageerror: ${String(error).slice(0, 200)}`));

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  expect(violations, violations.join('\n')).toHaveLength(0);
});

test('a tenant 404 is served with the headers too', async ({ request }) => {
  const response = await request.get('/', {
    headers: { host: 'gibt-es-nicht-xyz.lvh.me:3000' },
    failOnStatusCode: false,
  });

  expect(response.status()).toBe(404);
  expect(response.headers()['content-security-policy']).toBeTruthy();
});

test('the health endpoint answers with the deployment status', async ({ request }) => {
  const response = await request.get('/api/health', { failOnStatusCode: false });
  const body = (await response.json()) as {
    status: string;
    checks: { database: { status: string }; storage: { status: string } };
  };

  // The container health check hangs off exactly this contract.
  expect([200, 503]).toContain(response.status());
  expect(response.status() === 200).toBe(body.status === 'ok');
  expect(body.checks.database.status).toBeTruthy();
  expect(body.checks.storage.status).toBeTruthy();
});
