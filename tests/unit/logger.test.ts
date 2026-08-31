import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = process.env;

async function freshLogger(env: Record<string, string>) {
  process.env = { ...ORIGINAL_ENV, ...env } as NodeJS.ProcessEnv;
  vi.resetModules();
  return (await import('@/lib/logger')).logger;
}

let info: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  info = vi.spyOn(console, 'info').mockImplementation(() => {});
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  error = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

describe('logger', () => {
  it('writes one json object per line in production', async () => {
    const logger = await freshLogger({ NODE_ENV: 'production' });
    logger.info('Etwas ist passiert', { siteId: 'abc' });

    const line = String(info.mock.calls[0]?.[0]);
    const record = JSON.parse(line) as Record<string, unknown>;

    expect(record.level).toBe('info');
    expect(record.message).toBe('Etwas ist passiert');
    expect(record.siteId).toBe('abc');
    expect(typeof record.time).toBe('string');
  });

  it('redacts anything that must not end up in a log file', async () => {
    const logger = await freshLogger({ NODE_ENV: 'production' });
    logger.info('Anmeldung', {
      password: 'geheim',
      token: 'abc',
      email: 'ada@example.com',
      authorEmail: 'leser@example.com',
      siteId: 'ok-to-log',
    });

    const line = String(info.mock.calls[0]?.[0]);

    expect(line).not.toContain('geheim');
    expect(line).not.toContain('ada@example.com');
    expect(line).not.toContain('leser@example.com');
    expect(line).toContain('ok-to-log');
    expect(line).toContain('[redacted]');
  });

  it('redacts regardless of how the key is capitalised', async () => {
    const logger = await freshLogger({ NODE_ENV: 'production' });
    logger.info('x', { Password: 'geheim', TOKEN: 'abc' });

    expect(String(info.mock.calls[0]?.[0])).not.toContain('geheim');
  });

  it('keeps an error readable without dumping its stack', async () => {
    const logger = await freshLogger({ NODE_ENV: 'production' });
    logger.error('Fehlgeschlagen', { error: new Error('kaputt') });

    const record = JSON.parse(String(error.mock.calls[0]?.[0])) as {
      error: { name: string; message: string; stack?: string };
    };

    expect(record.error.message).toBe('kaputt');
    expect(record.error.stack).toBeUndefined();
  });

  it('sends warnings and errors to the right stream', async () => {
    const logger = await freshLogger({ NODE_ENV: 'production' });
    logger.warn('achtung');
    logger.error('kaputt');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('drops debug output in production but keeps it when asked', async () => {
    const quiet = await freshLogger({ NODE_ENV: 'production' });
    quiet.debug('leise');
    expect(info).not.toHaveBeenCalled();

    const loud = await freshLogger({ NODE_ENV: 'production', LOG_LEVEL: 'debug' });
    loud.debug('laut');
    expect(info).toHaveBeenCalledTimes(1);
  });

  it('honours a raised threshold', async () => {
    const logger = await freshLogger({ NODE_ENV: 'production', LOG_LEVEL: 'error' });
    logger.info('nicht wichtig');
    logger.warn('auch nicht');
    logger.error('doch');

    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
  });
});
