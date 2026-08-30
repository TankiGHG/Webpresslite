import { S3Client } from '@aws-sdk/client-s3';
import { getEnv } from '@/lib/env';

const globalForStorage = globalThis as unknown as { __webpresslite_s3?: S3Client };

export function getStorageClient(): S3Client {
  const env = getEnv();
  globalForStorage.__webpresslite_s3 ??= new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  return globalForStorage.__webpresslite_s3;
}
