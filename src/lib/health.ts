import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSql } from '@/lib/db/client';
import { getEnv } from '@/lib/env';
import { getStorageClient } from '@/lib/storage/client';

export type CheckStatus = 'ok' | 'error';

export interface CheckResult {
  status: CheckStatus;
  latencyMs: number;
  error?: string;
}

export interface HealthReport {
  status: CheckStatus;
  checkedAt: string;
  checks: {
    database: CheckResult;
    storage: CheckResult;
  };
}

async function timed(run: () => Promise<unknown>): Promise<CheckResult> {
  const startedAt = Date.now();
  try {
    await run();
    return { status: 'ok', latencyMs: Date.now() - startedAt };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkDatabase(): Promise<CheckResult> {
  return timed(async () => {
    const sql = getSql();
    await sql`select 1`;
  });
}

export async function checkStorage(): Promise<CheckResult> {
  // Listing one key proves credentials, bucket and read access in one call.
  // `HeadBucket` would only prove the bucket exists, and some S3
  // implementations answer it inconsistently.
  return timed(async () => {
    const env = getEnv();
    await getStorageClient().send(new ListObjectsV2Command({ Bucket: env.S3_BUCKET, MaxKeys: 1 }));
  });
}

export async function getHealthReport(): Promise<HealthReport> {
  const [database, storage] = await Promise.all([checkDatabase(), checkStorage()]);
  const status: CheckStatus = database.status === 'ok' && storage.status === 'ok' ? 'ok' : 'error';

  return { status, checkedAt: new Date().toISOString(), checks: { database, storage } };
}
