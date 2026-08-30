import 'server-only';
import { and, desc, eq, lte } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { posts, sites, type PostRow, type SiteRow } from '@/lib/db/schema';

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

export type PublicPostListItem = Pick<PostRow, 'id' | 'title' | 'slug' | 'excerpt' | 'publishedAt'>;

/**
 * Only published posts whose moment has actually passed. A scheduled post that
 * the cron job has not picked up yet must not leak through this path.
 */
function publishedCondition(siteId: string, now: Date) {
  return and(eq(posts.siteId, siteId), eq(posts.status, 'published'), lte(posts.publishedAt, now));
}

export async function listPublishedPosts(
  siteId: string,
  options: { limit?: number; now?: Date } = {},
): Promise<PublicPostListItem[]> {
  const { limit = 20, now = new Date() } = options;

  return getDb()
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(and(publishedCondition(siteId, now), eq(posts.type, 'post')))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}

export async function getPublishedPost(
  siteId: string,
  slug: string,
  options: { type?: 'post' | 'page'; now?: Date } = {},
): Promise<PostRow | null> {
  const { type = 'post', now = new Date() } = options;

  const rows = await getDb()
    .select()
    .from(posts)
    .where(and(publishedCondition(siteId, now), eq(posts.slug, slug), eq(posts.type, type)))
    .limit(1);

  return rows[0] ?? null;
}
