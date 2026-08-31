import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, asc, count, desc, eq, gt, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { comments, posts, type CommentRow } from '@/lib/db/schema';
import type { CommentStatus } from '@/lib/comments/constants';
import { requireCapability } from './sites';

export class CommentNotFoundError extends Error {
  constructor() {
    super('Comment not found.');
    this.name = 'CommentNotFoundError';
  }
}

export class CommentRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommentRejectedError';
  }
}

function newId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Commenter IP addresses are only ever stored hashed. They exist to rate limit
 * and to recognise repeat spam, not to identify readers.
 */
export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export interface PublicComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: Date;
}

/** Only approved comments are ever public. */
export async function listApprovedComments(postId: string): Promise<PublicComment[]> {
  return getDb()
    .select({
      id: comments.id,
      authorName: comments.authorName,
      body: comments.body,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.status, 'approved')))
    .orderBy(asc(comments.createdAt));
}

export async function countApprovedComments(postId: string): Promise<number> {
  const rows = await getDb()
    .select({ value: count() })
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.status, 'approved')));

  return rows[0]?.value ?? 0;
}

/** How many comments this address submitted recently, for rate limiting. */
export async function countRecentByIp(
  siteId: string,
  ipHash: string,
  since: Date,
): Promise<number> {
  const rows = await getDb()
    .select({ value: count() })
    .from(comments)
    .where(
      and(eq(comments.siteId, siteId), eq(comments.ipHash, ipHash), gt(comments.createdAt, since)),
    );

  return rows[0]?.value ?? 0;
}

export interface SubmitCommentInput {
  siteId: string;
  postSlug: string;
  authorName: string;
  authorEmail: string;
  body: string;
  ipHash: string | null;
}

/**
 * Stores a comment as `pending`. Nothing a visitor submits is ever public
 * without a moderator approving it first.
 */
export async function submitComment(input: SubmitCommentInput): Promise<CommentRow> {
  const now = new Date();

  // The post must exist, belong to this site, and actually be published —
  // otherwise a draft's slug would be a way to probe for unpublished content.
  const found = await getDb()
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        eq(posts.siteId, input.siteId),
        eq(posts.slug, input.postSlug),
        eq(posts.status, 'published'),
      ),
    )
    .limit(1);

  const post = found[0];
  if (!post) throw new CommentNotFoundError();

  const inserted = await getDb()
    .insert(comments)
    .values({
      id: newId(),
      postId: post.id,
      siteId: input.siteId,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      body: input.body,
      status: 'pending',
      ipHash: input.ipHash,
      createdAt: now,
    })
    .returning();

  const row = inserted[0];
  if (!row) throw new Error('Insert returned no row.');
  return row;
}

export interface ModerationComment {
  id: string;
  authorName: string;
  authorEmail: string;
  body: string;
  status: CommentStatus;
  createdAt: Date;
  postId: string;
  postTitle: string;
  postSlug: string;
}

export async function listCommentsForModeration(
  siteId: string,
  userId: string,
  status?: CommentStatus,
): Promise<ModerationComment[]> {
  await requireCapability(siteId, userId, 'comment:moderate');

  const where = status
    ? and(eq(comments.siteId, siteId), eq(comments.status, status))
    : eq(comments.siteId, siteId);

  return getDb()
    .select({
      id: comments.id,
      authorName: comments.authorName,
      authorEmail: comments.authorEmail,
      body: comments.body,
      status: comments.status,
      createdAt: comments.createdAt,
      postId: posts.id,
      postTitle: posts.title,
      postSlug: posts.slug,
    })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .where(where)
    .orderBy(desc(comments.createdAt));
}

export async function countPendingComments(siteId: string, userId: string): Promise<number> {
  await requireCapability(siteId, userId, 'comment:moderate');

  const rows = await getDb()
    .select({ value: count() })
    .from(comments)
    .where(and(eq(comments.siteId, siteId), eq(comments.status, 'pending')));

  return rows[0]?.value ?? 0;
}

export async function setCommentStatus(input: {
  siteId: string;
  userId: string;
  commentId: string;
  status: CommentStatus;
}): Promise<{ postSlug: string }> {
  await requireCapability(input.siteId, input.userId, 'comment:moderate');

  const updated = await getDb()
    .update(comments)
    .set({ status: input.status })
    .where(and(eq(comments.siteId, input.siteId), eq(comments.id, input.commentId)))
    .returning({ postId: comments.postId });

  const row = updated[0];
  if (!row) throw new CommentNotFoundError();

  const post = await getDb()
    .select({ slug: posts.slug })
    .from(posts)
    .where(eq(posts.id, row.postId))
    .limit(1);

  return { postSlug: post[0]?.slug ?? '' };
}

export async function deleteComment(input: {
  siteId: string;
  userId: string;
  commentId: string;
}): Promise<void> {
  await requireCapability(input.siteId, input.userId, 'comment:moderate');

  const deleted = await getDb()
    .delete(comments)
    .where(and(eq(comments.siteId, input.siteId), eq(comments.id, input.commentId)))
    .returning({ id: comments.id });

  if (deleted.length === 0) throw new CommentNotFoundError();
}

/** Comment counts per status, for the dashboard overview. */
export async function commentCounts(
  siteId: string,
  userId: string,
): Promise<Record<CommentStatus, number>> {
  await requireCapability(siteId, userId, 'comment:moderate');

  const rows = await getDb()
    .select({ status: comments.status, value: sql<number>`count(*)::int` })
    .from(comments)
    .where(eq(comments.siteId, siteId))
    .groupBy(comments.status);

  const result: Record<CommentStatus, number> = { pending: 0, approved: 0, spam: 0 };
  for (const row of rows) result[row.status] = row.value;
  return result;
}
