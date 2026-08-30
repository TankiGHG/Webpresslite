import { VARIANTS } from './constants';

export interface SrcSetSource {
  width: number | null;
  urls: { thumb: string; medium: string; full: string };
}

/**
 * Builds a `srcset` from the generated variants.
 *
 * Variants are never upscaled, so an original narrower than a variant width
 * would list the same pixels twice under different descriptors. Those entries
 * are dropped rather than lying to the browser about what it can get.
 */
export function buildSrcSet(item: SrcSetSource): string {
  const urls: Record<string, string> = item.urls;
  const original = item.width ?? Number.POSITIVE_INFINITY;
  const seen = new Set<number>();
  const entries: string[] = [];

  for (const variant of VARIANTS) {
    const width = Math.min(variant.width, original);
    if (seen.has(width)) continue;
    seen.add(width);

    const url = urls[variant.name];
    if (url) entries.push(`${url} ${width}w`);
  }

  return entries.join(', ');
}

/** Content column is at most 44rem, so a full viewport width below that. */
export const IMAGE_SIZES = '(max-width: 44rem) 100vw, 44rem';
