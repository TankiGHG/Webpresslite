import 'server-only';
import { and, count, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import sanitizeHtml from 'sanitize-html';
import { getDb } from '@/lib/db/client';
import {
  categories,
  media,
  postTags,
  posts,
  sites,
  tags,
  type PostRow,
  type SiteRow,
} from '@/lib/db/schema';
import { mediaBaseUrl } from '@/lib/env';
import { countWords, readingMinutes } from '@/lib/format';
import { publicUrl, variantKey } from '@/lib/media/keys';
import { buildSrcSet } from '@/lib/media/srcset';

/**
 * Cache tags. Public pages are cached per site and invalidated when that
 * site's content changes, so a publish is visible immediately without giving
 * up static rendering for everyone else.
 */
export function siteTag(siteId: string): string {
  return `site:${siteId}`;
}

export function siteContentTag(siteId: string): string {
  return `site-content:${siteId}`;
}

/**
 * `unstable_cache` stores its payload as JSON, so every `Date` comes back as an
 * ISO string while the types still claim `Date`. Everything read through the
 * cache is therefore revived explicitly before it leaves this module.
 */
function toDate(value: Date | string | null): Date | null {
  if (value === null) return null;
  return value instanceof Date ? value : new Date(value);
}

function reviveListItem(item: PublicPostListItem): PublicPostListItem {
  return { ...item, publishedAt: toDate(item.publishedAt) };
}

function reviveEntry(entry: PublishedEntry): PublishedEntry {
  return {
    ...entry,
    publishedAt: toDate(entry.publishedAt),
    updatedAt: toDate(entry.updatedAt) ?? new Date(0),
  };
}

function revivePost(post: PublicPost): PublicPost {
  return {
    ...post,
    publishedAt: toDate(post.publishedAt),
    createdAt: toDate(post.createdAt) ?? new Date(0),
    updatedAt: toDate(post.updatedAt) ?? new Date(0),
  };
}

/** A post's cover image with everything a responsive `<img>` needs. */
export interface PublicCover {
  id: string;
  alt: string;
  width: number | null;
  height: number | null;
  urls: { thumb: string; medium: string; full: string };
  srcset: string;
}

/** Columns selected from the joined media row; all null without a cover. */
const coverColumns = {
  coverId: media.id,
  coverAlt: media.alt,
  coverWidth: media.width,
  coverHeight: media.height,
};

type CoverColumns = {
  coverId: string | null;
  coverAlt: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
};

function toCover(siteId: string, row: CoverColumns): PublicCover | null {
  if (!row.coverId) return null;
  const base = mediaBaseUrl();
  const urls = {
    thumb: publicUrl(base, variantKey(siteId, row.coverId, 'thumb')),
    medium: publicUrl(base, variantKey(siteId, row.coverId, 'medium')),
    full: publicUrl(base, variantKey(siteId, row.coverId, 'full')),
  };
  return {
    id: row.coverId,
    alt: row.coverAlt ?? '',
    width: row.coverWidth,
    height: row.coverHeight,
    urls,
    srcset: buildSrcSet({ width: row.coverWidth, urls }),
  };
}

/** Selection shared by every public list; joined with `media` for the cover. */
const listColumns = {
  id: posts.id,
  title: posts.title,
  slug: posts.slug,
  excerpt: posts.excerpt,
  publishedAt: posts.publishedAt,
  categoryId: posts.categoryId,
  contentText: posts.contentText,
  ...coverColumns,
};

type ListRow = CoverColumns &
  Pick<PostRow, 'id' | 'title' | 'slug' | 'excerpt' | 'publishedAt' | 'categoryId'> & {
    contentText: string;
  };

function toListItem<T extends ListRow>(
  siteId: string,
  row: T,
): Omit<T, keyof CoverColumns | 'contentText'> & {
  cover: PublicCover | null;
  readingMinutes: number;
} {
  const { coverId, coverAlt, coverWidth, coverHeight, contentText, ...rest } = row;
  return {
    ...rest,
    cover: toCover(siteId, { coverId, coverAlt, coverWidth, coverHeight }),
    readingMinutes: readingMinutes(countWords(contentText)),
  };
}

/**
 * Reads for the public rendering path. These are intentionally unscoped by
 * user — a published site is public — but they never expose anything beyond
 * what a visitor is meant to see.
 */
export type PublicSite = Pick<
  SiteRow,
  'id' | 'name' | 'description' | 'subdomain' | 'customDomain' | 'theme' | 'themeSettings'
>;

/**
 * Site metadata changes rarely and is needed by every public request, so it is
 * cached until the site itself changes.
 */
export function getPublicSite(siteId: string): Promise<PublicSite | null> {
  return unstable_cache(() => loadPublicSite(siteId), ['public-site', siteId], {
    tags: [siteTag(siteId)],
    revalidate: 3600,
  })();
}

async function loadPublicSite(siteId: string): Promise<PublicSite | null> {
  const rows = await getDb()
    .select({
      id: sites.id,
      name: sites.name,
      description: sites.description,
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

export type PublicPostListItem = Pick<
  PostRow,
  'id' | 'title' | 'slug' | 'excerpt' | 'publishedAt' | 'categoryId'
> & {
  cover: PublicCover | null;
  readingMinutes: number;
};

export type PublishedEntry = Pick<PostRow, 'id' | 'title' | 'slug' | 'excerpt' | 'publishedAt'> & {
  type: 'post' | 'page';
  updatedAt: Date;
};

/** A published post as the public pages see it: the row plus its cover. */
export type PublicPost = PostRow & { cover: PublicCover | null; readingMinutes: number };

/**
 * Only published posts whose moment has actually passed. A scheduled post that
 * the cron job has not picked up yet must not leak through this path.
 */
function publishedCondition(siteId: string, now: Date) {
  return and(eq(posts.siteId, siteId), eq(posts.status, 'published'), lte(posts.publishedAt, now));
}

export const POSTS_PER_PAGE = 10;

export interface PublishedPage {
  posts: PublicPostListItem[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listPublishedPosts(
  siteId: string,
  options: { limit?: number; offset?: number; now?: Date } = {},
): Promise<PublicPostListItem[]> {
  const { limit = POSTS_PER_PAGE, offset = 0, now = new Date() } = options;

  const rows = await getDb()
    .select(listColumns)
    .from(posts)
    .leftJoin(media, eq(media.id, posts.coverMediaId))
    .where(and(publishedCondition(siteId, now), eq(posts.type, 'post')))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => toListItem(siteId, row));
}

export async function countPublishedPosts(siteId: string, now = new Date()): Promise<number> {
  const rows = await getDb()
    .select({ value: count() })
    .from(posts)
    .where(and(publishedCondition(siteId, now), eq(posts.type, 'post')));

  return rows[0]?.value ?? 0;
}

/**
 * One page of the archive, with the totals needed to render pagination.
 *
 * The result is not cached across the `now` boundary: a scheduled post becomes
 * visible the moment its timestamp passes, and caching that away would make
 * publishing look broken.
 */
export async function getPublishedPage(siteId: string, page: number): Promise<PublishedPage> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  const cached = await unstable_cache(
    () => loadPublishedPage(siteId, safePage),
    ['published-page', siteId, String(safePage)],
    { tags: [siteContentTag(siteId)], revalidate: 300 },
  )();

  return { ...cached, posts: cached.posts.map(reviveListItem) };
}

async function loadPublishedPage(siteId: string, safePage: number): Promise<PublishedPage> {
  const now = new Date();

  const total = await countPublishedPosts(siteId, now);
  const pageCount = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  const current = Math.min(safePage, pageCount);

  const items = await listPublishedPosts(siteId, {
    limit: POSTS_PER_PAGE,
    offset: (current - 1) * POSTS_PER_PAGE,
    now,
  });

  return { posts: items, total, page: current, pageCount };
}

/** Everything published, for the feed, the sitemap and the full archive. */
export async function listAllPublished(siteId: string): Promise<PublishedEntry[]> {
  const cached = await unstable_cache(() => loadAllPublished(siteId), ['published-all', siteId], {
    tags: [siteContentTag(siteId)],
    revalidate: 300,
  })();

  return cached.map(reviveEntry);
}

async function loadAllPublished(siteId: string): Promise<PublishedEntry[]> {
  const now = new Date();

  return getDb()
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      type: posts.type,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(publishedCondition(siteId, now))
    .orderBy(desc(posts.publishedAt));
}

export async function getPublishedPost(
  siteId: string,
  slug: string,
  options: { type?: 'post' | 'page' } = {},
): Promise<PublicPost | null> {
  const type = options.type ?? 'post';

  const cached = await unstable_cache(
    () => loadPublishedPost(siteId, slug, type),
    ['published-post', siteId, type, slug],
    { tags: [siteContentTag(siteId)], revalidate: 300 },
  )();

  return cached ? revivePost(cached) : null;
}

async function loadPublishedPost(
  siteId: string,
  slug: string,
  type: 'post' | 'page',
): Promise<PublicPost | null> {
  const now = new Date();

  const rows = await getDb()
    .select({ post: posts, ...coverColumns })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.coverMediaId))
    .where(and(publishedCondition(siteId, now), eq(posts.slug, slug), eq(posts.type, type)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  const { post, ...cover } = row;
  return {
    ...post,
    cover: toCover(siteId, cover),
    readingMinutes: readingMinutes(countWords(post.contentText)),
  };
}

// --- Taxonomies and search ---------------------------------------------------

export interface PublicTaxonomy {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  postCount: number;
}

/**
 * The search expression. It must stay byte for byte the same as the one behind
 * `posts_search_idx`, otherwise Postgres falls back to a sequential scan.
 */
function searchVector() {
  return sql`to_tsvector('german', ${posts.title} || ' ' || coalesce(${posts.excerpt}, '') || ' ' || ${posts.contentText})`;
}

export async function listPublicCategories(siteId: string): Promise<PublicTaxonomy[]> {
  const now = new Date();

  return getDb()
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      postCount: sql<number>`count(${posts.id})::int`,
    })
    .from(categories)
    .leftJoin(
      posts,
      and(
        eq(posts.categoryId, categories.id),
        eq(posts.status, 'published'),
        lte(posts.publishedAt, now),
      ),
    )
    .where(eq(categories.siteId, siteId))
    .groupBy(categories.id)
    .having(sql`count(${posts.id}) > 0`)
    .orderBy(categories.name);
}

export async function getCategoryBySlug(
  siteId: string,
  slug: string,
): Promise<{ id: string; name: string; description: string | null } | null> {
  const rows = await getDb()
    .select({ id: categories.id, name: categories.name, description: categories.description })
    .from(categories)
    .where(and(eq(categories.siteId, siteId), eq(categories.slug, slug)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getTagBySlug(
  siteId: string,
  slug: string,
): Promise<{ id: string; name: string } | null> {
  const rows = await getDb()
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(and(eq(tags.siteId, siteId), eq(tags.slug, slug)))
    .limit(1);

  return rows[0] ?? null;
}

export async function listPostsInCategory(
  siteId: string,
  categoryId: string,
): Promise<PublicPostListItem[]> {
  const now = new Date();

  const rows = await getDb()
    .select(listColumns)
    .from(posts)
    .leftJoin(media, eq(media.id, posts.coverMediaId))
    .where(and(publishedCondition(siteId, now), eq(posts.categoryId, categoryId)))
    .orderBy(desc(posts.publishedAt));

  return rows.map((row) => toListItem(siteId, row));
}

export async function listPostsWithTag(
  siteId: string,
  tagId: string,
): Promise<PublicPostListItem[]> {
  const now = new Date();

  const rows = await getDb()
    .select(listColumns)
    .from(posts)
    .innerJoin(postTags, eq(postTags.postId, posts.id))
    .leftJoin(media, eq(media.id, posts.coverMediaId))
    .where(and(publishedCondition(siteId, now), eq(postTags.tagId, tagId)))
    .orderBy(desc(posts.publishedAt));

  return rows.map((row) => toListItem(siteId, row));
}

export interface SearchHit extends PublicPostListItem {
  rank: number;
  headline: string;
}

/**
 * Full text search within one site.
 *
 * `websearch_to_tsquery` takes what people actually type — quoted phrases, `or`,
 * a leading minus — without throwing on syntax a plain `to_tsquery` would
 * reject. The site scope is part of the WHERE clause, so a search can never
 * reach across tenants.
 */
/**
 * `ts_headline` returns the *original* text with the markers inserted — it does
 * not escape anything. A post whose body contains markup would otherwise be
 * injected verbatim into the results page, so the snippet is reduced to the one
 * tag we asked Postgres to add.
 */
function sanitizeHeadline(headline: string): string {
  return sanitizeHtml(headline, { allowedTags: ['mark'], allowedAttributes: {} });
}

/**
 * Postgres cuts the snippet mid-sentence without saying so. An ellipsis on
 * whichever side is open makes it read as an excerpt rather than a truncated
 * thought. Sanitize first: the ellipses are the only text added afterwards.
 */
function frameHeadline(headline: string, opening: string): string {
  const safe = sanitizeHeadline(headline);
  const plain = safe.replace(/<\/?mark>/g, '');
  const leading = plain.length === 0 || opening.startsWith(plain.slice(0, 24)) ? '' : '… ';
  const trailing = plain.length === 0 || /[.!?…"“”)]$/.test(plain) ? '' : ' …';
  return `${leading}${safe}${trailing}`;
}

export async function searchPosts(siteId: string, query: string, limit = 20): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const now = new Date();
  const tsQuery = sql`websearch_to_tsquery('german', ${trimmed})`;

  const rows = await getDb()
    .select({
      ...listColumns,
      rank: sql<number>`ts_rank(${searchVector()}, ${tsQuery})`,
      headline: sql<string>`ts_headline('german', ${posts.contentText}, ${tsQuery}, 'MaxWords=30, MinWords=10, ShortWord=3, MaxFragments=1, StartSel=<mark>, StopSel=</mark>')`,
      opening: sql<string>`left(${posts.contentText}, 64)`,
    })
    .from(posts)
    .leftJoin(media, eq(media.id, posts.coverMediaId))
    .where(
      and(
        publishedCondition(siteId, now),
        eq(posts.type, 'post'),
        sql`${searchVector()} @@ ${tsQuery}`,
      ),
    )
    .orderBy(sql`ts_rank(${searchVector()}, ${tsQuery}) desc`)
    .limit(limit);

  return rows.map((row) => ({
    ...toListItem(siteId, row),
    headline: frameHeadline(row.headline, row.opening),
  }));
}

/** Tags of a set of posts, for rendering them under an article. */
export async function getPublicPostTags(
  postIds: string[],
): Promise<Map<string, { name: string; slug: string }[]>> {
  if (postIds.length === 0) return new Map();

  const rows = await getDb()
    .select({ postId: postTags.postId, name: tags.name, slug: tags.slug })
    .from(postTags)
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .where(inArray(postTags.postId, postIds))
    .orderBy(tags.name);

  const result = new Map<string, { name: string; slug: string }[]>();
  for (const row of rows) {
    const bucket = result.get(row.postId);
    if (bucket) bucket.push({ name: row.name, slug: row.slug });
    else result.set(row.postId, [{ name: row.name, slug: row.slug }]);
  }

  return result;
}

export async function getPostCategory(
  siteId: string,
  categoryId: string | null,
): Promise<{ name: string; slug: string } | null> {
  if (!categoryId) return null;

  const rows = await getDb()
    .select({ name: categories.name, slug: categories.slug })
    .from(categories)
    .where(and(eq(categories.siteId, siteId), eq(categories.id, categoryId)))
    .limit(1);

  return rows[0] ?? null;
}
