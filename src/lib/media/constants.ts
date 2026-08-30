/**
 * Upload rules and image variants, free of server dependencies so the browser
 * can apply the same checks before starting an upload.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Only formats `sharp` can decode and that are safe to serve inline. */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export const EXTENSION_BY_MIME: Record<AllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export interface VariantSpec {
  name: string;
  width: number;
}

/**
 * Variants are WebP throughout: one format keeps the `srcset` simple, and every
 * browser that matters has supported it for years.
 */
export const VARIANTS = [
  { name: 'thumb', width: 320 },
  { name: 'medium', width: 800 },
  { name: 'full', width: 1600 },
] as const;

export type VariantName = (typeof VARIANTS)[number]['name'];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface UploadRejection {
  reason: string;
}

/** The same guard runs in the browser and again on the server. */
export function validateUpload(input: { mimeType: string; size: number }): UploadRejection | null {
  if (!isAllowedMimeType(input.mimeType)) {
    return { reason: 'Nur Bilder in JPEG, PNG, WebP, AVIF oder GIF sind erlaubt.' };
  }
  if (input.size <= 0) {
    return { reason: 'Die Datei ist leer.' };
  }
  if (input.size > MAX_UPLOAD_BYTES) {
    return { reason: `Die Datei ist größer als ${formatBytes(MAX_UPLOAD_BYTES)}.` };
  }
  return null;
}
