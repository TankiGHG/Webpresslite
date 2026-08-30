import 'server-only';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from '@/lib/env';
import { getStorageClient } from './client';

/** How long a browser has to start and finish the direct upload. */
const UPLOAD_URL_TTL_SECONDS = 300;

/**
 * A presigned PUT for a single, server-chosen key. The content type is part of
 * the signature, so a client that promised an image cannot upload something
 * else under the same URL.
 */
export async function presignUpload(input: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<{ url: string; expiresIn: number }> {
  const env = getEnv();

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  });

  const url = await getSignedUrl(getStorageClient(), command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });

  return { url, expiresIn: UPLOAD_URL_TTL_SECONDS };
}

export async function getObjectBytes(key: string): Promise<Buffer> {
  const env = getEnv();
  const result = await getStorageClient().send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
  );

  if (!result.Body) throw new Error(`Object ${key} has no body.`);

  const bytes = await result.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function putObject(input: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<void> {
  const env = getEnv();

  await getStorageClient().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      // Variants are immutable: their key changes when the image changes.
      CacheControl: input.cacheControl ?? 'public, max-age=31536000, immutable',
    }),
  );
}

/** Removes everything under a prefix, so no orphaned variant is left behind. */
export async function deletePrefix(prefix: string): Promise<number> {
  const env = getEnv();
  const client = getStorageClient();
  let removed = 0;
  let continuationToken: string | undefined;

  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: env.S3_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const keys = (listed.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => typeof key === 'string');

    if (keys.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: env.S3_BUCKET,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        }),
      );
      removed += keys.length;
    }

    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);

  return removed;
}
