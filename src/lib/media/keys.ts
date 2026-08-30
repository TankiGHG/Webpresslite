import { EXTENSION_BY_MIME, type AllowedMimeType, type VariantName } from './constants';

/**
 * Storage keys are derived, never taken from the client. A filename from a
 * browser can contain anything — path separators, `..`, control characters —
 * and must never reach the object store.
 */
export function originalKey(siteId: string, mediaId: string, mimeType: AllowedMimeType): string {
  return `sites/${siteId}/media/${mediaId}/original.${EXTENSION_BY_MIME[mimeType]}`;
}

export function variantKey(siteId: string, mediaId: string, variant: VariantName): string {
  return `sites/${siteId}/media/${mediaId}/${variant}.webp`;
}

export function mediaPrefix(siteId: string, mediaId: string): string {
  return `sites/${siteId}/media/${mediaId}/`;
}

/** Strips a browser filename down to something safe to show in the library. */
export function safeFileName(input: string): string {
  const base = input.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    // Control characters would show up as invisible junk in the library.
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  return cleaned || 'Bild';
}

export function publicUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, '')}/${key}`;
}
