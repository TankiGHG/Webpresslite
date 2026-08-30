const MAX_SLUG_LENGTH = 96;

/**
 * Turns a title into a URL slug. German umlauts are transliterated before
 * normalising — otherwise NFKD splits them and "Größe" would become "groe".
 */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '');

  return slug;
}

/**
 * A slug that is unique within its site. `isTaken` is asked per candidate
 * rather than the caller pre-loading every slug, which keeps the check
 * correct even while other posts are being created.
 */
export async function uniqueSlug(
  desired: string,
  isTaken: (candidate: string) => Promise<boolean>,
  fallback = 'beitrag',
): Promise<string> {
  const base = slugify(desired) || fallback;

  if (!(await isTaken(base))) return base;

  for (let suffix = 2; suffix <= 200; suffix += 1) {
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - 5)}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  // Practically unreachable, but a collision must never silently overwrite.
  return `${base.slice(0, MAX_SLUG_LENGTH - 12)}-${Date.now().toString(36)}`;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
