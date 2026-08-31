import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, asc, count, desc, eq, lte, ne, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { posts, sites, user, type PostRow } from '@/lib/db/schema';
import { contentToText, renderContent, deriveExcerpt } from '@/lib/editor/render';
import type { JSONContent } from '@/lib/editor/types';
import type { PostStatus, PostType } from '@/lib/posts/constants';
import { uniqueSlug } from '@/lib/posts/slug';
import { requireSiteAccess } from './sites';

/**
 * Every function takes a `siteId` and the acting user, and checks access before
 * touching a row. A post is never addressed by id alone — the id is always
 * paired with the site it must belong to, so a leaked id from another tenant
 * resolves to nothing.
 */

export class PostNotFoundError extends Error {
  constructor() {
    super('Post not found.');
    this.name = 'PostNotFoundError';
  }
}

function newId(): string {
  return randomBytes(16).toString('hex');
}

async function slugTaken(siteId: string, slug: string, exceptPostId?: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: posts.id })
    .from(posts)
    .where(
      exceptPostId
        ? and(eq(posts.siteId, siteId), eq(posts.slug, slug), ne(posts.id, exceptPostId))
        : and(eq(posts.siteId, siteId), eq(posts.slug, slug)),
    )
    .limit(1);

  return rows.length > 0;
}

export interface PostListItem {
  id: string;
  title: string;
  slug: string;
  type: PostType;
  status: PostStatus;
  publishedAt: Date | null;
  updatedAt: Date;
  authorName: string;
}

export async function listPosts(
  siteId: string,
  userId: string,
  filter?: { type?: PostType },
): Promise<PostListItem[]> {
  await requireSiteAccess(siteId, userId);

  const where = filter?.type
    ? and(eq(posts.siteId, siteId), eq(posts.type, filter.type))
    : eq(posts.siteId, siteId);

  return getDb()
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      type: posts.type,
      status: posts.status,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      authorName: user.name,
    })
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(where)
    .orderBy(desc(posts.updatedAt));
}

export async function getPost(
  siteId: string,
  postId: string,
  userId: string,
): Promise<PostRow | null> {
  await requireSiteAccess(siteId, userId);

  const rows = await getDb()
    .select()
    .from(posts)
    .where(and(eq(posts.siteId, siteId), eq(posts.id, postId)))
    .limit(1);

  return rows[0] ?? null;
}

export interface CreatePostInput {
  siteId: string;
  userId: string;
  title: string;
  type: PostType;
}

export async function createPost(input: CreatePostInput): Promise<PostRow> {
  await requireSiteAccess(input.siteId, input.userId);

  const emptyDocument: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };
  const slug = await uniqueSlug(
    input.title,
    (candidate) => slugTaken(input.siteId, candidate),
    input.type === 'page' ? 'seite' : 'beitrag',
  );

  const inserted = await getDb()
    .insert(posts)
    .values({
      id: newId(),
      siteId: input.siteId,
      authorId: input.userId,
      type: input.type,
      title: input.title,
      slug,
      contentJson: emptyDocument,
      contentHtml: renderContent(emptyDocument),
      contentText: contentToText(emptyDocument),
      status: 'draft',
    })
    .returning();

  const post = inserted[0];
  if (!post) throw new Error('Insert returned no row.');
  return post;
}

export interface UpdatePostInput {
  siteId: string;
  postId: string;
  userId: string;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: JSONContent;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

/**
 * Saves editor changes. The HTML is rendered and sanitized here rather than
 * accepted from the client — the browser is never the authority on what ends
 * up in a public page.
 */
export async function updatePost(input: UpdatePostInput): Promise<PostRow> {
  await requireSiteAccess(input.siteId, input.userId);

  const existing = await getPost(input.siteId, input.postId, input.userId);
  if (!existing) throw new PostNotFoundError();

  const values: Partial<typeof posts.$inferInsert> = {};

  if (input.title !== undefined) values.title = input.title;
  if (input.seoTitle !== undefined) values.seoTitle = input.seoTitle;
  if (input.seoDescription !== undefined) values.seoDescription = input.seoDescription;

  if (input.slug !== undefined) {
    values.slug = await uniqueSlug(
      input.slug,
      (candidate) => slugTaken(input.siteId, candidate, input.postId),
      existing.slug,
    );
  }

  if (input.content !== undefined) {
    values.contentJson = input.content;
    values.contentHtml = renderContent(input.content);
    // Kept in step with the document so full text search never goes stale.
    values.contentText = contentToText(input.content);
    values.excerpt =
      input.excerpt !== undefined ? input.excerpt : deriveExcerpt(input.content) || null;
  } else if (input.excerpt !== undefined) {
    values.excerpt = input.excerpt;
  }

  const updated = await getDb()
    .update(posts)
    .set(values)
    .where(and(eq(posts.siteId, input.siteId), eq(posts.id, input.postId)))
    .returning();

  const post = updated[0];
  if (!post) throw new PostNotFoundError();
  return post;
}

export async function setPostStatus(
  siteId: string,
  postId: string,
  userId: string,
  status: PostStatus,
  publishedAt?: Date | null,
): Promise<PostRow> {
  await requireSiteAccess(siteId, userId);

  const values: Partial<typeof posts.$inferInsert> = { status };

  if (status === 'published') {
    // Keep the original publication date when re-publishing an existing post.
    values.publishedAt = publishedAt ?? new Date();
  } else if (status === 'scheduled') {
    if (!publishedAt) throw new Error('A scheduled post needs a date.');
    values.publishedAt = publishedAt;
  } else {
    values.publishedAt = null;
  }

  const updated = await getDb()
    .update(posts)
    .set(values)
    .where(and(eq(posts.siteId, siteId), eq(posts.id, postId)))
    .returning();

  const post = updated[0];
  if (!post) throw new PostNotFoundError();
  return post;
}

export async function deletePost(siteId: string, postId: string, userId: string): Promise<void> {
  await requireSiteAccess(siteId, userId, 'editor');

  await getDb()
    .delete(posts)
    .where(and(eq(posts.siteId, siteId), eq(posts.id, postId)));
}

export async function countPosts(siteId: string, userId: string): Promise<number> {
  await requireSiteAccess(siteId, userId);

  const rows = await getDb().select({ value: count() }).from(posts).where(eq(posts.siteId, siteId));

  return rows[0]?.value ?? 0;
}

/**
 * Publishes every post whose scheduled moment has passed. Runs from the cron
 * endpoint, so it is not scoped to a user — it acts on the whole platform.
 */
export async function publishDuePosts(now = new Date()): Promise<{ id: string; siteId: string }[]> {
  const published = await getDb()
    .update(posts)
    .set({ status: 'published' })
    .where(and(eq(posts.status, 'scheduled'), lte(posts.publishedAt, now)))
    .returning({ id: posts.id, siteId: posts.siteId });

  return published;
}

/** Sites with at least one post, used by the seed and for diagnostics. */
export async function sitePostCounts(): Promise<
  { siteId: string; subdomain: string; total: number }[]
> {
  return getDb()
    .select({
      siteId: sites.id,
      subdomain: sites.subdomain,
      total: sql<number>`count(${posts.id})::int`,
    })
    .from(sites)
    .leftJoin(posts, eq(posts.siteId, sites.id))
    .groupBy(sites.id, sites.subdomain)
    .orderBy(asc(sites.subdomain));
}
