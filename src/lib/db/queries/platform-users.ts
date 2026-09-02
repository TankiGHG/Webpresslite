import 'server-only';
import { asc, count, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { sites, user } from '@/lib/db/schema';

/**
 * Platform-wide user management for platform admins. Distinct from
 * queries/sites.ts, which scopes everything to one site — these queries are
 * deliberately *not* siteId-scoped, so they stay in their own module rather
 * than blurring that boundary.
 */

export class PlatformAccessError extends Error {
  constructor(message = 'Platform admin access required.') {
    super(message);
    this.name = 'PlatformAccessError';
  }
}

export class PlatformUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlatformUserError';
  }
}

export async function requirePlatformAdmin(userId: string): Promise<void> {
  const rows = await getDb()
    .select({ isPlatformAdmin: user.isPlatformAdmin })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!rows[0]?.isPlatformAdmin) throw new PlatformAccessError();
}

export interface PlatformUserRow {
  id: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
  bannedAt: Date | null;
  createdAt: Date;
  ownedSiteCount: number;
}

/** Every registered user, oldest first. Platform admin only. */
export async function listAllUsers(actorId: string): Promise<PlatformUserRow[]> {
  await requirePlatformAdmin(actorId);

  const ownedCounts = getDb()
    .select({ ownerId: sites.ownerId, ownedSiteCount: count(sites.id).as('owned_site_count') })
    .from(sites)
    .groupBy(sites.ownerId)
    .as('owned_counts');

  const rows = await getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
      bannedAt: user.bannedAt,
      createdAt: user.createdAt,
      ownedSiteCount: ownedCounts.ownedSiteCount,
    })
    .from(user)
    .leftJoin(ownedCounts, eq(ownedCounts.ownerId, user.id))
    .orderBy(asc(user.createdAt));

  return rows.map((row) => ({ ...row, ownedSiteCount: row.ownedSiteCount ?? 0 }));
}

/** The sites a user owns, for the confirmation dialog before deleting them. */
export async function listOwnedSiteNames(actorId: string, targetUserId: string): Promise<string[]> {
  await requirePlatformAdmin(actorId);

  const rows = await getDb()
    .select({ name: sites.name })
    .from(sites)
    .where(eq(sites.ownerId, targetUserId));

  return rows.map((row) => row.name);
}

export async function setPlatformAdmin(
  actorId: string,
  targetUserId: string,
  value: boolean,
): Promise<void> {
  await requirePlatformAdmin(actorId);

  if (!value && targetUserId === actorId) {
    const remaining = await getDb()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.isPlatformAdmin, true));

    if (remaining.length <= 1) {
      throw new PlatformUserError(
        'Du bist der einzige Platform-Admin — dir selbst die Rechte zu entziehen würde die Plattform ohne Admin zurücklassen.',
      );
    }
  }

  await getDb().update(user).set({ isPlatformAdmin: value }).where(eq(user.id, targetUserId));
}

export async function setUserBanned(
  actorId: string,
  targetUserId: string,
  banned: boolean,
): Promise<void> {
  await requirePlatformAdmin(actorId);

  if (targetUserId === actorId) {
    throw new PlatformUserError('Du kannst dich nicht selbst sperren.');
  }

  await getDb()
    .update(user)
    .set({ bannedAt: banned ? new Date() : null })
    .where(eq(user.id, targetUserId));
}

/**
 * Deletes the account. Sites the user owns cascade away with it (see the
 * `owner_id` foreign key in schema.ts) — the caller must have made that
 * unmistakably clear before calling this.
 */
export async function deleteUserAccount(actorId: string, targetUserId: string): Promise<void> {
  await requirePlatformAdmin(actorId);

  if (targetUserId === actorId) {
    throw new PlatformUserError('Du kannst deinen eigenen Account hier nicht löschen.');
  }

  await getDb().delete(user).where(eq(user.id, targetUserId));
}
