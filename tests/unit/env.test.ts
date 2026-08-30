import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const validEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://user:pass@127.0.0.1:5432/db',
  ROOT_DOMAIN: 'lvh.me:3000',
  APP_URL: 'http://lvh.me:3000',
  S3_ENDPOINT: 'http://127.0.0.1:9000',
  S3_BUCKET: 'media',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
  AUTH_SECRET: 'a'.repeat(32),
};

let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = process.env;
  process.env = { ...validEnv } as NodeJS.ProcessEnv;
  // getEnv() memoizes, so every case needs a fresh module instance.
  vi.resetModules();
});

afterEach(() => {
  process.env = originalEnv;
});

async function loadGetEnv() {
  const { getEnv } = await import('@/lib/env');
  return getEnv;
}

describe('getEnv', () => {
  it('parses a complete configuration', async () => {
    const env = (await loadGetEnv())();

    expect(env.ROOT_DOMAIN).toBe('lvh.me:3000');
    expect(env.S3_REGION).toBe('us-east-1');
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
  });

  it('treats S3_FORCE_PATH_STYLE=false as false', async () => {
    process.env.S3_FORCE_PATH_STYLE = 'false';

    expect((await loadGetEnv())().S3_FORCE_PATH_STYLE).toBe(false);
  });

  it('reports every missing variable at once', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    const getEnv = await loadGetEnv();

    expect(getEnv).toThrowError(/DATABASE_URL[\s\S]*AUTH_SECRET/);
  });

  it('rejects a short auth secret', async () => {
    process.env.AUTH_SECRET = 'too-short';
    const getEnv = await loadGetEnv();

    expect(getEnv).toThrowError(/AUTH_SECRET/);
  });

  it('rejects a malformed database url', async () => {
    process.env.DATABASE_URL = 'not-a-url';
    const getEnv = await loadGetEnv();

    expect(getEnv).toThrowError(/DATABASE_URL/);
  });

  it('treats an empty optional variable as unset', async () => {
    process.env.SMTP_HOST = '   ';
    const env = (await loadGetEnv())();

    expect(env.SMTP_HOST).toBeUndefined();
  });

  it('defaults the smtp port', async () => {
    const env = (await loadGetEnv())();

    expect(env.SMTP_PORT).toBe(587);
  });
});

describe('isGithubOAuthEnabled', () => {
  it('is disabled when neither credential is set', async () => {
    const { getEnv, isGithubOAuthEnabled } = await import('@/lib/env');

    expect(isGithubOAuthEnabled(getEnv())).toBe(false);
  });

  it('is enabled when both credentials are set', async () => {
    process.env.GITHUB_CLIENT_ID = 'client-id';
    process.env.GITHUB_CLIENT_SECRET = 'client-secret';
    const { getEnv, isGithubOAuthEnabled } = await import('@/lib/env');

    expect(isGithubOAuthEnabled(getEnv())).toBe(true);
  });

  it('refuses a half-configured provider', async () => {
    process.env.GITHUB_CLIENT_ID = 'client-id';
    const { getEnv } = await import('@/lib/env');

    expect(getEnv).toThrowError(/GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET/);
  });
});
