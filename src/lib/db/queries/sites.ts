import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, asc, eq, or } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { siteMembers, sites, type SiteRow } from '@/lib/db/schema';
import { roleAtLeast, type SiteRole } from '@/lib/sites/roles';

/**
 * Every function here takes the acting user and scopes its query to what that
 * user may see. Nothing outside this module reads the site tables, so a missing
 * permission check cannot slip in elsewhere.
 */

export class SiteAccessError extends Error {
  constructor(message = 'No access to this site.') {
    super(message);
    this.name = 'SiteAccessError';
  }
}

export class SubdomainTakenError extends Error {
  constructor(subdomain: string) {
    super(`The subdomain "${subdomain}" is already taken.`);
    this.name = 'SubdomainTakenError';
  }
}

export interface SiteWithRole extends SiteRow {
  role: SiteRole;
}

function newId(): string {
  return randomBytes(16).toString('hex');
}

/** All sites the user is a member of, owned ones included. */
export async function listSitesForUser(userId: string): Promise<SiteWithRole[]> {
  const rows = await getDb()
    .select({ site: sites, role: siteMembers.role })
    .from(siteMembers)
    .innerJoin(sites, eq(sites.id, siteMembers.siteId))
    .where(eq(siteMembers.userId, userId))
    .orderBy(asc(sites.createdAt));

  return rows.map((row) => ({ ...row.site, role: row.role }));
}

/**
 * Loads a site *for a specific user*. Returns null when the site does not exist
 * or the user is not a member — the two are deliberately indistinguishable, so
 * the dashboard cannot be used to probe for foreign site ids.
 */
export async function getSiteForUser(siteId: string, userId: string): Promise<SiteWithRole | null> {
  const rows = await getDb()
    .select({ site: sites, role: siteMembers.role })
    .from(siteMembers)
    .innerJoin(sites, eq(sites.id, siteMembers.siteId))
    .where(and(eq(siteMembers.siteId, siteId), eq(siteMembers.userId, userId)))
    .limit(1);

  const row = rows[0];
  return row ? { ...row.site, role: row.role } : null;
}

/** Same as `getSiteForUser`, but throws when the user has no access. */
export async function requireSiteAccess(
  siteId: string,
  userId: string,
  minimumRole: SiteRole = 'author',
): Promise<SiteWithRole> {
  const site = await getSiteForUser(siteId, userId);
  if (!site || !roleAtLeast(site.role, minimumRole)) {
    throw new SiteAccessError();
  }
  return site;
}

/**
 * Public lookup by host, used by the tenant routing. Deliberately *not* scoped
 * to a user: published sites are public by definition.
 */
export async function findSiteByHost(host: {
  subdomain?: string;
  customDomain?: string;
}): Promise<Pick<SiteRow, 'id' | 'subdomain'> | null> {
  const conditions = [];
  if (host.subdomain) conditions.push(eq(sites.subdomain, host.subdomain));
  if (host.customDomain) conditions.push(eq(sites.customDomain, host.customDomain));
  if (conditions.length === 0) return null;

  const rows = await getDb()
    .select({ id: sites.id, subdomain: sites.subdomain })
    .from(sites)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions))
    .limit(1);

  return rows[0] ?? null;
}

export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.subdomain, subdomain))
    .limit(1);

  return rows.length === 0;
}

export interface CreateSiteInput {
  name: string;
  subdomain: string;
  ownerId: string;
}

/** Creates a site and makes the creator its owner, in one transaction. */
export async function createSite(input: CreateSiteInput): Promise<SiteRow> {
  const id = newId();

  try {
    return await getDb().transaction(async (tx) => {
      const inserted = await tx
        .insert(sites)
        .values({ id, name: input.name, subdomain: input.subdomain, ownerId: input.ownerId })
        .returning();

      const site = inserted[0];
      if (!site) throw new Error('Insert returned no row.');

      await tx
        .insert(siteMembers)
        .values({ siteId: site.id, userId: input.ownerId, role: 'owner' });

      return site;
    });
  } catch (error) {
    // The unique index is the authority: an availability check moments earlier
    // can still lose a race against a concurrent request.
    if (isUniqueViolation(error, 'sites_subdomain_unique')) {
      throw new SubdomainTakenError(input.subdomain);
    }
    throw error;
  }
}

export interface UpdateSiteThemeInput {
  siteId: string;
  userId: string;
  theme: string;
  themeSettings: Record<string, unknown>;
}

/** Changing how a site looks is a site setting, so it needs admin rights. */
export async function updateSiteTheme(input: UpdateSiteThemeInput): Promise<SiteRow> {
  await requireSiteAccess(input.siteId, input.userId, 'admin');

  const updated = await getDb()
    .update(sites)
    .set({ theme: input.theme, themeSettings: input.themeSettings })
    .where(eq(sites.id, input.siteId))
    .returning();

  const site = updated[0];
  if (!site) throw new SiteAccessError();
  return site;
}

/** Deletes a site. Only the owner may do this; members cascade away with it. */
export async function deleteSite(siteId: string, userId: string): Promise<void> {
  await requireSiteAccess(siteId, userId, 'owner');
  await getDb().delete(sites).where(eq(sites.id, siteId));
}

/**
 * Drizzle wraps driver errors in a `DrizzleQueryError`, so the Postgres error
 * code lives on `cause` rather than on the thrown error itself.
 */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && current !== null && typeof current === 'object'; depth += 1) {
    const candidate = current as {
      code?: unknown;
      constraint_name?: unknown;
      message?: unknown;
      cause?: unknown;
    };

    if (
      candidate.code === '23505' &&
      (candidate.constraint_name === constraint ||
        (typeof candidate.message === 'string' && candidate.message.includes(constraint)))
    ) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}
