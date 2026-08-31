import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { categories, postTags, posts, tags, type CategoryRow, type TagRow } from '@/lib/db/schema';
import { uniqueSlug } from '@/lib/posts/slug';
import { requireCapability, requireSiteAccess } from './sites';

export class TaxonomyNotFoundError extends Error {
  constructor() {
    super('Taxonomy entry not found.');
    this.name = 'TaxonomyNotFoundError';
  }
}

function newId(): string {
  return randomBytes(16).toString('hex');
}

export interface TaxonomyWithCount {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  postCount: number;
}

// --- Categories --------------------------------------------------------------

async function categorySlugTaken(siteId: string, slug: string, except?: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.siteId, siteId), eq(categories.slug, slug)))
    .limit(2);

  return rows.some((row) => row.id !== except);
}

export async function listCategories(siteId: string, userId: string): Promise<TaxonomyWithCount[]> {
  await requireSiteAccess(siteId, userId);

  const rows = await getDb()
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      postCount: sql<number>`count(${posts.id})::int`,
    })
    .from(categories)
    .leftJoin(posts, eq(posts.categoryId, categories.id))
    .where(eq(categories.siteId, siteId))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));

  return rows;
}

export async function createCategory(input: {
  siteId: string;
  userId: string;
  name: string;
  description?: string | null;
}): Promise<CategoryRow> {
  await requireCapability(input.siteId, input.userId, 'taxonomy:manage');

  const slug = await uniqueSlug(
    input.name,
    (candidate) => categorySlugTaken(input.siteId, candidate),
    'kategorie',
  );

  const inserted = await getDb()
    .insert(categories)
    .values({
      id: newId(),
      siteId: input.siteId,
      name: input.name,
      slug,
      description: input.description ?? null,
    })
    .returning();

  const row = inserted[0];
  if (!row) throw new Error('Insert returned no row.');
  return row;
}

export async function deleteCategory(input: {
  siteId: string;
  userId: string;
  categoryId: string;
}): Promise<void> {
  await requireCapability(input.siteId, input.userId, 'taxonomy:manage');

  // Posts keep existing; they simply lose the category (`on delete set null`).
  const deleted = await getDb()
    .delete(categories)
    .where(and(eq(categories.siteId, input.siteId), eq(categories.id, input.categoryId)))
    .returning({ id: categories.id });

  if (deleted.length === 0) throw new TaxonomyNotFoundError();
}

// --- Tags --------------------------------------------------------------------

async function tagSlugTaken(siteId: string, slug: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.siteId, siteId), eq(tags.slug, slug)))
    .limit(1);

  return rows.length > 0;
}

export async function listTags(siteId: string, userId: string): Promise<TaxonomyWithCount[]> {
  await requireSiteAccess(siteId, userId);

  return getDb()
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      postCount: sql<number>`count(${postTags.postId})::int`,
    })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .where(eq(tags.siteId, siteId))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));
}

/**
 * Resolves tag names to ids, creating the ones that do not exist yet. That is
 * how a tag input is expected to behave: the author types, the tag appears.
 */
export async function ensureTags(
  siteId: string,
  userId: string,
  names: string[],
): Promise<TagRow[]> {
  await requireSiteAccess(siteId, userId);

  const wanted = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (wanted.length === 0) return [];

  const existing = await getDb().select().from(tags).where(eq(tags.siteId, siteId));

  const byName = new Map(existing.map((tag) => [tag.name.toLowerCase(), tag]));
  const result: TagRow[] = [];

  for (const name of wanted) {
    const found = byName.get(name.toLowerCase());
    if (found) {
      result.push(found);
      continue;
    }

    const slug = await uniqueSlug(name, (candidate) => tagSlugTaken(siteId, candidate), 'tag');
    const inserted = await getDb()
      .insert(tags)
      .values({ id: newId(), siteId, name, slug })
      .returning();

    const row = inserted[0];
    if (row) {
      result.push(row);
      byName.set(name.toLowerCase(), row);
    }
  }

  return result;
}

export async function setPostTags(input: {
  siteId: string;
  userId: string;
  postId: string;
  tagNames: string[];
}): Promise<void> {
  await requireSiteAccess(input.siteId, input.userId);

  const resolved = await ensureTags(input.siteId, input.userId, input.tagNames);

  await getDb().transaction(async (tx) => {
    await tx.delete(postTags).where(eq(postTags.postId, input.postId));

    if (resolved.length > 0) {
      await tx
        .insert(postTags)
        .values(resolved.map((tag) => ({ postId: input.postId, tagId: tag.id })));
    }
  });
}

export async function getPostTags(
  siteId: string,
  postId: string,
  userId: string,
): Promise<TagRow[]> {
  await requireSiteAccess(siteId, userId);

  const rows = await getDb()
    .select({ tag: tags })
    .from(postTags)
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .where(and(eq(postTags.postId, postId), eq(tags.siteId, siteId)))
    .orderBy(asc(tags.name));

  return rows.map((row) => row.tag);
}

export async function setPostCategory(input: {
  siteId: string;
  userId: string;
  postId: string;
  categoryId: string | null;
}): Promise<void> {
  await requireSiteAccess(input.siteId, input.userId);

  // A category from another site must never be assignable.
  if (input.categoryId) {
    const rows = await getDb()
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.siteId, input.siteId), eq(categories.id, input.categoryId)))
      .limit(1);

    if (rows.length === 0) throw new TaxonomyNotFoundError();
  }

  await getDb()
    .update(posts)
    .set({ categoryId: input.categoryId })
    .where(and(eq(posts.siteId, input.siteId), eq(posts.id, input.postId)));
}

/** Deletes tags that no post references any more. */
export async function pruneUnusedTags(siteId: string, userId: string): Promise<number> {
  await requireCapability(siteId, userId, 'taxonomy:manage');

  const orphans = await getDb()
    .select({ id: tags.id, used: count(postTags.postId) })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .where(eq(tags.siteId, siteId))
    .groupBy(tags.id)
    .having(sql`count(${postTags.postId}) = 0`);

  if (orphans.length === 0) return 0;

  await getDb()
    .delete(tags)
    .where(
      and(
        eq(tags.siteId, siteId),
        inArray(
          tags.id,
          orphans.map((row) => row.id),
        ),
      ),
    );

  return orphans.length;
}
