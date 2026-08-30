import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const sqlMock = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getSql: () => sqlMock,
}));

vi.mock('@/lib/storage/client', () => ({
  getStorageClient: () => ({ send: sendMock }),
}));

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ S3_BUCKET: 'media' }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  sqlMock.mockResolvedValue([{ '?column?': 1 }]);
  sendMock.mockResolvedValue({});
});

describe('getHealthReport', () => {
  it('reports ok when both database and storage answer', async () => {
    const { getHealthReport } = await import('@/lib/health');
    const report = await getHealthReport();

    expect(report.status).toBe('ok');
    expect(report.checks.database.status).toBe('ok');
    expect(report.checks.storage.status).toBe('ok');
    expect(report.checks.database.error).toBeUndefined();
    expect(Date.parse(report.checkedAt)).not.toBeNaN();
  });

  it('degrades to error and surfaces the message when storage fails', async () => {
    sendMock.mockRejectedValue(new Error('NoSuchBucket'));
    const { getHealthReport } = await import('@/lib/health');
    const report = await getHealthReport();

    expect(report.status).toBe('error');
    expect(report.checks.database.status).toBe('ok');
    expect(report.checks.storage).toMatchObject({ status: 'error', error: 'NoSuchBucket' });
  });

  it('degrades to error when the database is unreachable', async () => {
    sqlMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const { getHealthReport } = await import('@/lib/health');
    const report = await getHealthReport();

    expect(report.status).toBe('error');
    expect(report.checks.database).toMatchObject({ status: 'error', error: 'ECONNREFUSED' });
  });

  it('runs both checks even when one of them fails', async () => {
    sqlMock.mockRejectedValue(new Error('down'));
    const { checkStorage, getHealthReport } = await import('@/lib/health');
    await getHealthReport();

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(checkStorage).toBeTypeOf('function');
  });
});
