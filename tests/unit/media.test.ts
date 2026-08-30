import { describe, expect, it } from 'vitest';
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  formatBytes,
  isAllowedMimeType,
  validateUpload,
} from '@/lib/media/constants';
import { mediaPrefix, originalKey, publicUrl, safeFileName, variantKey } from '@/lib/media/keys';
import { buildSrcSet } from '@/lib/media/srcset';
import { consumeUploadSlot, resetUploadLimits, UPLOAD_LIMIT } from '@/lib/media/rate-limit';

describe('validateUpload', () => {
  it.each(ALLOWED_MIME_TYPES)('accepts %s', (mimeType) => {
    expect(validateUpload({ mimeType, size: 1024 })).toBeNull();
  });

  it.each(['text/plain', 'application/pdf', 'image/svg+xml', 'text/html'])(
    'rejects %s',
    (mimeType) => {
      expect(validateUpload({ mimeType, size: 1024 })?.reason).toContain('Nur Bilder');
    },
  );

  it('rejects an svg, which can carry script', () => {
    expect(isAllowedMimeType('image/svg+xml')).toBe(false);
  });

  it('rejects an empty file', () => {
    expect(validateUpload({ mimeType: 'image/png', size: 0 })?.reason).toContain('leer');
  });

  it('rejects a file over the limit but accepts one exactly at it', () => {
    expect(validateUpload({ mimeType: 'image/png', size: MAX_UPLOAD_BYTES + 1 })).not.toBeNull();
    expect(validateUpload({ mimeType: 'image/png', size: MAX_UPLOAD_BYTES })).toBeNull();
  });
});

describe('formatBytes', () => {
  it('scales the unit', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('storage keys', () => {
  it('derives the original key from ids, never from the filename', () => {
    expect(originalKey('site1', 'm1', 'image/jpeg')).toBe('sites/site1/media/m1/original.jpg');
    expect(originalKey('site1', 'm1', 'image/png')).toBe('sites/site1/media/m1/original.png');
  });

  it('puts every variant under the media prefix', () => {
    const prefix = mediaPrefix('site1', 'm1');
    for (const variant of ['thumb', 'medium', 'full'] as const) {
      expect(variantKey('site1', 'm1', variant).startsWith(prefix)).toBe(true);
      expect(variantKey('site1', 'm1', variant).endsWith('.webp')).toBe(true);
    }
  });

  it('joins the public url without doubling the slash', () => {
    expect(publicUrl('http://host/bucket/', 'a/b.webp')).toBe('http://host/bucket/a/b.webp');
    expect(publicUrl('http://host/bucket', 'a/b.webp')).toBe('http://host/bucket/a/b.webp');
  });
});

describe('safeFileName', () => {
  it('keeps a normal name', () => {
    expect(safeFileName('urlaub.jpg')).toBe('urlaub.jpg');
  });

  it('strips directories, including traversal attempts', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('C:\\Users\\me\\bild.png')).toBe('bild.png');
  });

  it('removes control characters', () => {
    expect(safeFileName('bi\u0000ld\u001f.png')).toBe('bild.png');
  });

  it('falls back when nothing usable is left', () => {
    expect(safeFileName('')).toBe('Bild');
    expect(safeFileName('/')).toBe('Bild');
  });

  it('caps the length', () => {
    expect(safeFileName(`${'a'.repeat(300)}.jpg`).length).toBeLessThanOrEqual(120);
  });
});

describe('buildSrcSet', () => {
  const urls = { thumb: 'u/thumb.webp', medium: 'u/medium.webp', full: 'u/full.webp' };

  it('lists every variant for a large original', () => {
    expect(buildSrcSet({ width: 2400, urls })).toBe(
      'u/thumb.webp 320w, u/medium.webp 800w, u/full.webp 1600w',
    );
  });

  it('caps the descriptors at the original width', () => {
    // A 1000px original is never upscaled, so "full" really is 1000px wide.
    expect(buildSrcSet({ width: 1000, urls })).toBe(
      'u/thumb.webp 320w, u/medium.webp 800w, u/full.webp 1000w',
    );
  });

  it('does not list the same width twice', () => {
    const result = buildSrcSet({ width: 200, urls });

    expect(result).toBe('u/thumb.webp 200w');
    expect(result.split(',').length).toBe(1);
  });
});

describe('consumeUploadSlot', () => {
  it('allows up to the limit within a window', () => {
    resetUploadLimits();
    for (let index = 0; index < UPLOAD_LIMIT.max; index += 1) {
      expect(consumeUploadSlot('user-a', 1000).allowed, `attempt ${index}`).toBe(true);
    }

    const blocked = consumeUploadSlot('user-a', 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('counts each user separately', () => {
    resetUploadLimits();
    for (let index = 0; index < UPLOAD_LIMIT.max; index += 1) consumeUploadSlot('user-a', 1000);

    expect(consumeUploadSlot('user-b', 1000).allowed).toBe(true);
  });

  it('frees up once the window has passed', () => {
    resetUploadLimits();
    for (let index = 0; index < UPLOAD_LIMIT.max; index += 1) consumeUploadSlot('user-a', 1000);

    expect(consumeUploadSlot('user-a', 1000 + UPLOAD_LIMIT.windowMs + 1).allowed).toBe(true);
  });
});
