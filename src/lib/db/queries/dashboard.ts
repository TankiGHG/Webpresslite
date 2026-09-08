import 'server-only';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { comments, posts, user } from '@/lib/db/schema';
import type { PostStatus, PostType } from '@/lib/posts/constants';
import { can } from '@/lib/sites/permissions';
import { listSitesForUser, requireSiteAccess, type SiteWithRole } from './sites';

export interface SiteSummary extends SiteWithRole {
  publishedCount: number;
  draftCount: number;
  scheduledCount: number;
  /** Only filled for roles that may moderate; authors see 0. */
  pendingComments: number;
  lastEditedAt: Date | null;
}

/**
 * Everything the dashboard shows per site, in two grouped queries instead of
 * one round trip per site. Membership is resolved once via `listSitesForUser`,
 * so the counts can never include a site the user is not part of.
 */
export async function listSiteSummaries(userId: string): Promise<SiteSummary[]> {
  const sites = await listSitesForUser(userId);
  if (sites.length === 0) return [];

  const siteIds = sites.map((site) => site.id);
  const db = getDb();

  const [postRows, commentRows] = await Promise.all([
    db
      .select({
        siteId: posts.siteId,
        status: posts.status,
        value: count(),
        lastEditedAt: sql<Date | null>`max(${posts.updatedAt})`,
      })
      .from(posts)
      .where(inArray(posts.siteId, siteIds))
      .groupBy(posts.siteId, posts.status),
    db
      .select({ siteId: comments.siteId, value: count() })
      .from(comments)
      .where(and(inArray(comments.siteId, siteIds), eq(comments.status, 'pending')))
      .groupBy(comments.siteId),
  ]);

  const pending = new Map(commentRows.map((row) => [row.siteId, row.value]));

  return sites.map((site) => {
    const summary: SiteSummary = {
      ...site,
      publishedCount: 0,
      draftCount: 0,
      scheduledCount: 0,
      pendingComments: can(site.role, 'comment:moderate') ? (pending.get(site.id) ?? 0) : 0,
      lastEditedAt: null,
    };
    for (const row of postRows) {
      if (row.siteId !== site.id) continue;
      if (row.status === 'published') summary.publishedCount = row.value;
      else if (row.status === 'scheduled') summary.scheduledCount = row.value;
      else summary.draftCount += row.value;
      const edited = row.lastEditedAt ? new Date(row.lastEditedAt) : null;
      if (edited && (!summary.lastEditedAt || edited > summary.lastEditedAt)) {
        summary.lastEditedAt = edited;
      }
    }
    return summary;
  });
}

export interface RecentPost {
  id: string;
  title: string;
  status: PostStatus;
  type: PostType;
  updatedAt: Date;
  authorName: string;
}

export interface SiteOverview {
  publishedCount: number;
  draftCount: number;
  scheduledCount: number;
  pageCount: number;
  recent: RecentPost[];
}

/** Numbers and the latest activity for one site's overview page. */
export async function getSiteOverview(
  siteId: string,
  userId: string,
  recentLimit = 6,
): Promise<SiteOverview> {
  await requireSiteAccess(siteId, userId);
  const db = getDb();

  const [countRows, recentRows] = await Promise.all([
    db
      .select({ status: posts.status, type: posts.type, value: count() })
      .from(posts)
      .where(eq(posts.siteId, siteId))
      .groupBy(posts.status, posts.type),
    db
      .select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        type: posts.type,
        updatedAt: posts.updatedAt,
        authorName: user.name,
      })
      .from(posts)
      .innerJoin(user, eq(user.id, posts.authorId))
      .where(eq(posts.siteId, siteId))
      .orderBy(desc(posts.updatedAt))
      .limit(recentLimit),
  ]);

  const overview: SiteOverview = {
    publishedCount: 0,
    draftCount: 0,
    scheduledCount: 0,
    pageCount: 0,
    recent: recentRows,
  };

  for (const row of countRows) {
    if (row.type === 'page') {
      overview.pageCount += row.value;
      continue;
    }
    if (row.status === 'published') overview.publishedCount += row.value;
    else if (row.status === 'scheduled') overview.scheduledCount += row.value;
    else overview.draftCount += row.value;
  }

  return overview;
}
