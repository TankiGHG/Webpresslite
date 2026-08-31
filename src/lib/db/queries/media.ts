import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { media, posts, type MediaRow } from '@/lib/db/schema';
import { mediaBaseUrl } from '@/lib/env';
import { isAllowedMimeType, validateUpload, type AllowedMimeType } from '@/lib/media/constants';
import { mediaPrefix, originalKey, publicUrl, safeFileName, variantKey } from '@/lib/media/keys';
import { processImage } from '@/lib/media/process';
import { deletePrefix, getObjectBytes, presignUpload, putObject } from '@/lib/storage/objects';
import { limitsFor } from '@/lib/sites/plans';
import { PlanLimitError, requireCapability, requireSiteAccess } from './sites';

export class MediaNotFoundError extends Error {
  constructor() {
    super('Media not found.');
    this.name = 'MediaNotFoundError';
  }
}

export class UploadRejectedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'UploadRejectedError';
  }
}

function newId(): string {
  return randomBytes(16).toString('hex');
}

export interface MediaItem {
  id: string;
  fileName: string;
  alt: string | null;
  mime: string;
  width: number | null;
  height: number | null;
  size: number;
  createdAt: Date;
  /** Variant URLs, ready for a `srcset`. */
  urls: { thumb: string; medium: string; full: string };
}

function toItem(row: MediaRow): MediaItem {
  const base = mediaBaseUrl();

  return {
    id: row.id,
    fileName: row.fileName,
    alt: row.alt,
    mime: row.mime,
    width: row.width,
    height: row.height,
    size: row.size,
    createdAt: row.createdAt,
    urls: {
      thumb: publicUrl(base, variantKey(row.siteId, row.id, 'thumb')),
      medium: publicUrl(base, variantKey(row.siteId, row.id, 'medium')),
      full: publicUrl(base, variantKey(row.siteId, row.id, 'full')),
    },
  };
}

/** Only finished uploads appear in the library. */
export async function listMedia(siteId: string, userId: string): Promise<MediaItem[]> {
  await requireSiteAccess(siteId, userId);

  const rows = await getDb()
    .select()
    .from(media)
    .where(and(eq(media.siteId, siteId), isNotNull(media.processedAt)))
    .orderBy(desc(media.createdAt));

  return rows.map(toItem);
}

export async function countMedia(siteId: string, userId: string): Promise<number> {
  await requireSiteAccess(siteId, userId);

  const rows = await getDb().select({ value: count() }).from(media).where(eq(media.siteId, siteId));

  return rows[0]?.value ?? 0;
}

export async function getMedia(
  siteId: string,
  mediaId: string,
  userId: string,
): Promise<MediaItem | null> {
  await requireSiteAccess(siteId, userId);

  const rows = await getDb()
    .select()
    .from(media)
    .where(and(eq(media.siteId, siteId), eq(media.id, mediaId)))
    .limit(1);

  const row = rows[0];
  return row ? toItem(row) : null;
}

export interface StartUploadResult {
  mediaId: string;
  uploadUrl: string;
  expiresIn: number;
}

/**
 * Reserves a media row and hands back a presigned URL for exactly that object.
 * The key is derived here, so a client cannot choose where its bytes land.
 */
export async function startUpload(input: {
  siteId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  size: number;
}): Promise<StartUploadResult> {
  const site = await requireCapability(input.siteId, input.userId, 'media:upload');

  const used = await getDb()
    .select({ value: count() })
    .from(media)
    .where(eq(media.siteId, input.siteId));

  const limit = limitsFor(site.plan).mediaPerSite;
  if ((used[0]?.value ?? 0) >= limit) {
    throw new PlanLimitError(
      `Der Plan ${site.plan} erlaubt ${limit} Medien pro Site. Wechsle zu Pro für mehr.`,
    );
  }

  const rejection = validateUpload({ mimeType: input.mimeType, size: input.size });
  if (rejection) throw new UploadRejectedError(rejection.reason);

  const mimeType = input.mimeType as AllowedMimeType;
  const mediaId = newId();
  const key = originalKey(input.siteId, mediaId, mimeType);

  await getDb()
    .insert(media)
    .values({
      id: mediaId,
      siteId: input.siteId,
      uploadedBy: input.userId,
      key,
      mime: mimeType,
      fileName: safeFileName(input.fileName),
      size: input.size,
    });

  const { url, expiresIn } = await presignUpload({
    key,
    contentType: mimeType,
    contentLength: input.size,
  });

  return { mediaId, uploadUrl: url, expiresIn };
}

/**
 * Reads the uploaded original back, generates the variants and marks the row
 * as processed. Until this succeeds the upload stays invisible in the library.
 */
export async function finishUpload(input: {
  siteId: string;
  userId: string;
  mediaId: string;
}): Promise<MediaItem> {
  await requireSiteAccess(input.siteId, input.userId);

  const rows = await getDb()
    .select()
    .from(media)
    .where(and(eq(media.siteId, input.siteId), eq(media.id, input.mediaId)))
    .limit(1);

  const row = rows[0];
  if (!row) throw new MediaNotFoundError();
  if (!isAllowedMimeType(row.mime)) throw new UploadRejectedError('Nicht unterstütztes Format.');

  const original = await getObjectBytes(row.key);

  let processed;
  try {
    processed = await processImage(original);
  } catch {
    // The bytes were not a decodable image after all. Leave nothing behind.
    await deletePrefix(mediaPrefix(input.siteId, input.mediaId));
    await getDb().delete(media).where(eq(media.id, input.mediaId));
    throw new UploadRejectedError('Die Datei ist kein lesbares Bild.');
  }

  for (const variant of processed.variants) {
    await putObject({
      key: variantKey(input.siteId, input.mediaId, variant.name),
      body: variant.body,
      contentType: 'image/webp',
    });
  }

  const updated = await getDb()
    .update(media)
    .set({
      width: processed.width,
      height: processed.height,
      size: original.byteLength,
      processedAt: new Date(),
    })
    .where(eq(media.id, input.mediaId))
    .returning();

  const result = updated[0];
  if (!result) throw new MediaNotFoundError();
  return toItem(result);
}

export async function updateAltText(input: {
  siteId: string;
  userId: string;
  mediaId: string;
  alt: string | null;
}): Promise<void> {
  await requireSiteAccess(input.siteId, input.userId);

  const updated = await getDb()
    .update(media)
    .set({ alt: input.alt })
    .where(and(eq(media.siteId, input.siteId), eq(media.id, input.mediaId)))
    .returning({ id: media.id });

  if (updated.length === 0) throw new MediaNotFoundError();
}

/** Deletes the row and every object below its prefix. */
export async function deleteMedia(input: {
  siteId: string;
  userId: string;
  mediaId: string;
}): Promise<void> {
  await requireCapability(input.siteId, input.userId, 'media:delete');

  const rows = await getDb()
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.siteId, input.siteId), eq(media.id, input.mediaId)))
    .limit(1);

  if (rows.length === 0) throw new MediaNotFoundError();

  // Storage first: a failure here must not leave a row pointing at nothing,
  // and a leftover object without a row is invisible but harmless.
  await deletePrefix(mediaPrefix(input.siteId, input.mediaId));

  // Posts referencing this image as their cover fall back to none.
  await getDb()
    .update(posts)
    .set({ coverMediaId: null })
    .where(and(eq(posts.siteId, input.siteId), eq(posts.coverMediaId, input.mediaId)));

  await getDb().delete(media).where(eq(media.id, input.mediaId));
}
