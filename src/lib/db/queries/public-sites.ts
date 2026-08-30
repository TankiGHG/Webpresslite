import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { sites, type SiteRow } from '@/lib/db/schema';

/**
 * Reads for the public rendering path. These are intentionally unscoped by
 * user — a published site is public — but they never expose anything beyond
 * what a visitor is meant to see.
 */
export type PublicSite = Pick<
  SiteRow,
  'id' | 'name' | 'subdomain' | 'customDomain' | 'theme' | 'themeSettings'
>;

export async function getPublicSite(siteId: string): Promise<PublicSite | null> {
  const rows = await getDb()
    .select({
      id: sites.id,
      name: sites.name,
      subdomain: sites.subdomain,
      customDomain: sites.customDomain,
      theme: sites.theme,
      themeSettings: sites.themeSettings,
    })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);

  return rows[0] ?? null;
}
