import 'server-only';
import sharp from 'sharp';
import { VARIANTS, type VariantName } from './constants';

export interface ProcessedVariant {
  name: VariantName;
  width: number;
  height: number;
  body: Buffer;
}

export interface ProcessedImage {
  width: number;
  height: number;
  variants: ProcessedVariant[];
}

/**
 * Decodes the uploaded bytes and produces the WebP variants.
 *
 * `sharp` is also the real content check: a file that claims to be an image but
 * is not fails here, after the MIME check and before anything is served.
 * Animated GIFs are flattened to their first frame — resizing an animation
 * would silently produce a still anyway.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const source = sharp(input, { failOn: 'error' });
  const metadata = await source.metadata();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width <= 0 || height <= 0) {
    throw new Error('Die Datei enthält kein lesbares Bild.');
  }

  const variants: ProcessedVariant[] = [];

  for (const spec of VARIANTS) {
    // Never upscale: a 400px original stays 400px in every variant.
    const targetWidth = Math.min(spec.width, width);

    const pipeline = sharp(input, { failOn: 'error' })
      .rotate()
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: 82 });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

    variants.push({
      name: spec.name,
      width: info.width,
      height: info.height,
      body: data,
    });
  }

  return { width, height, variants };
}
