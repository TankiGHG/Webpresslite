import 'server-only';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { pageViews, posts } from '@/lib/db/schema';
import { requireCapability } from './sites';

/** `YYYY-MM-DD` in UTC, the granularity the whole feature works at. */
export function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Counts one view.
 *
 * Aggregated on write: a single upsert per request, no row per event. That
 * keeps the table small, makes the charts a plain read, and means the platform
 * never holds a trail of who read what.
 */
export async function recordView(input: {
  siteId: string;
  postId: string | null;
  day?: string;
}): Promise<void> {
  const day = input.day ?? dayKey();

  await getDb()
    .insert(pageViews)
    .values({ siteId: input.siteId, postId: input.postId, day, count: 1 })
    .onConflictDoUpdate({
      target: [pageViews.siteId, pageViews.day, pageViews.postId],
      set: { count: sql`${pageViews.count} + 1` },
    });
}

export interface DailyViews {
  day: string;
  views: number;
}

export interface TopPost {
  postId: string;
  title: string;
  slug: string;
  views: number;
}

export interface SiteStats {
  daily: DailyViews[];
  topPosts: TopPost[];
  total: number;
  previousTotal: number;
  days: number;
}

function isoDay(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - offsetDays);
  return dayKey(date);
}

/**
 * Reach over the last `days` days, plus the window before it for comparison.
 * Days without views are filled in as zero, so a chart shows a gap rather than
 * silently closing it.
 */
export async function getSiteStats(siteId: string, userId: string, days = 30): Promise<SiteStats> {
  await requireCapability(siteId, userId, 'stats:view');

  const from = isoDay(days - 1);
  const previousFrom = isoDay(days * 2 - 1);

  const rows = await getDb()
    .select({ day: pageViews.day, views: sql<number>`sum(${pageViews.count})::int` })
    .from(pageViews)
    .where(and(eq(pageViews.siteId, siteId), gte(pageViews.day, previousFrom)))
    .groupBy(pageViews.day)
    .orderBy(pageViews.day);

  const byDay = new Map(rows.map((row) => [row.day, row.views]));

  const daily: DailyViews[] = [];
  let total = 0;
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = isoDay(offset);
    const views = byDay.get(day) ?? 0;
    daily.push({ day, views });
    total += views;
  }

  let previousTotal = 0;
  for (let offset = days * 2 - 1; offset >= days; offset -= 1) {
    previousTotal += byDay.get(isoDay(offset)) ?? 0;
  }

  const topPosts = await getDb()
    .select({
      postId: posts.id,
      title: posts.title,
      slug: posts.slug,
      views: sql<number>`sum(${pageViews.count})::int`,
    })
    .from(pageViews)
    .innerJoin(posts, eq(posts.id, pageViews.postId))
    .where(and(eq(pageViews.siteId, siteId), gte(pageViews.day, from)))
    .groupBy(posts.id)
    .orderBy(desc(sql`sum(${pageViews.count})`))
    .limit(10);

  return { daily, topPosts, total, previousTotal, days };
}
