import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, asc, count, eq, gt, isNull, ne } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { siteInvitations, siteMembers, sites, user, type SiteInvitationRow } from '@/lib/db/schema';
import { limitsFor } from '@/lib/sites/plans';
import { assignableRoles } from '@/lib/sites/permissions';
import type { SiteRole } from '@/lib/sites/roles';
import { requireCapability, SiteAccessError } from './sites';

export class MemberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemberError';
  }
}

export class InvitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvitationError';
  }
}

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function newId(): string {
  return randomBytes(16).toString('hex');
}

/** The token lives only in the invitation mail; the database keeps its hash. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface Member {
  userId: string;
  name: string;
  email: string;
  role: SiteRole;
  joinedAt: Date;
  isOwner: boolean;
}

export async function listMembers(siteId: string, userId: string): Promise<Member[]> {
  await requireCapability(siteId, userId, 'site:members');

  const rows = await getDb()
    .select({
      userId: siteMembers.userId,
      name: user.name,
      email: user.email,
      role: siteMembers.role,
      joinedAt: siteMembers.createdAt,
      ownerId: sites.ownerId,
    })
    .from(siteMembers)
    .innerJoin(user, eq(user.id, siteMembers.userId))
    .innerJoin(sites, eq(sites.id, siteMembers.siteId))
    .where(eq(siteMembers.siteId, siteId))
    .orderBy(asc(siteMembers.createdAt));

  return rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: row.role,
    joinedAt: row.joinedAt,
    isOwner: row.ownerId === row.userId,
  }));
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: SiteRole;
  expiresAt: Date;
  createdAt: Date;
}

export async function listInvitations(
  siteId: string,
  userId: string,
): Promise<PendingInvitation[]> {
  await requireCapability(siteId, userId, 'site:members');

  return getDb()
    .select({
      id: siteInvitations.id,
      email: siteInvitations.email,
      role: siteInvitations.role,
      expiresAt: siteInvitations.expiresAt,
      createdAt: siteInvitations.createdAt,
    })
    .from(siteInvitations)
    .where(and(eq(siteInvitations.siteId, siteId), isNull(siteInvitations.acceptedAt)))
    .orderBy(asc(siteInvitations.createdAt));
}

async function countSeats(siteId: string): Promise<number> {
  const members = await getDb()
    .select({ value: count() })
    .from(siteMembers)
    .where(eq(siteMembers.siteId, siteId));

  const open = await getDb()
    .select({ value: count() })
    .from(siteInvitations)
    .where(
      and(
        eq(siteInvitations.siteId, siteId),
        isNull(siteInvitations.acceptedAt),
        gt(siteInvitations.expiresAt, new Date()),
      ),
    );

  // An open invitation already claims a seat, otherwise the limit could be
  // overshot by inviting more people than there is room for.
  return (members[0]?.value ?? 0) + (open[0]?.value ?? 0);
}

export interface CreatedInvitation {
  invitation: SiteInvitationRow;
  /** Plain token, for the mail. Never stored and never returned again. */
  token: string;
}

export async function inviteMember(input: {
  siteId: string;
  userId: string;
  email: string;
  role: SiteRole;
}): Promise<CreatedInvitation> {
  const site = await requireCapability(input.siteId, input.userId, 'site:members');

  if (!assignableRoles(site.role).includes(input.role)) {
    throw new InvitationError('Diese Rolle darfst du nicht vergeben.');
  }

  const email = input.email.trim().toLowerCase();

  const alreadyMember = await getDb()
    .select({ id: siteMembers.userId })
    .from(siteMembers)
    .innerJoin(user, eq(user.id, siteMembers.userId))
    .where(and(eq(siteMembers.siteId, input.siteId), eq(user.email, email)))
    .limit(1);

  if (alreadyMember.length > 0) {
    throw new InvitationError('Diese Person ist schon Mitglied dieser Site.');
  }

  const openForEmail = await getDb()
    .select({ id: siteInvitations.id })
    .from(siteInvitations)
    .where(
      and(
        eq(siteInvitations.siteId, input.siteId),
        eq(siteInvitations.email, email),
        isNull(siteInvitations.acceptedAt),
      ),
    )
    .limit(1);

  if (openForEmail.length > 0) {
    throw new InvitationError('Für diese Adresse ist schon eine Einladung offen.');
  }

  const limits = limitsFor(site.plan);
  if ((await countSeats(input.siteId)) >= limits.membersPerSite) {
    throw new InvitationError(
      `Der Plan ${site.plan} erlaubt ${limits.membersPerSite} Mitglieder. Weitere gibt es im Pro-Plan.`,
    );
  }

  const token = randomBytes(32).toString('base64url');

  const inserted = await getDb()
    .insert(siteInvitations)
    .values({
      id: newId(),
      siteId: input.siteId,
      email,
      role: input.role,
      tokenHash: hashToken(token),
      invitedBy: input.userId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    })
    .returning();

  const invitation = inserted[0];
  if (!invitation) throw new Error('Insert returned no row.');

  return { invitation, token };
}

export async function revokeInvitation(input: {
  siteId: string;
  userId: string;
  invitationId: string;
}): Promise<void> {
  await requireCapability(input.siteId, input.userId, 'site:members');

  const deleted = await getDb()
    .delete(siteInvitations)
    .where(
      and(eq(siteInvitations.siteId, input.siteId), eq(siteInvitations.id, input.invitationId)),
    )
    .returning({ id: siteInvitations.id });

  if (deleted.length === 0) throw new InvitationError('Einladung nicht gefunden.');
}

export interface InvitationPreview {
  siteName: string;
  siteId: string;
  role: SiteRole;
  email: string;
}

/** Reads an invitation by its token, without accepting it. */
export async function previewInvitation(token: string): Promise<InvitationPreview | null> {
  const rows = await getDb()
    .select({
      siteId: siteInvitations.siteId,
      role: siteInvitations.role,
      email: siteInvitations.email,
      expiresAt: siteInvitations.expiresAt,
      acceptedAt: siteInvitations.acceptedAt,
      siteName: sites.name,
    })
    .from(siteInvitations)
    .innerJoin(sites, eq(sites.id, siteInvitations.siteId))
    .where(eq(siteInvitations.tokenHash, hashToken(token)))
    .limit(1);

  const row = rows[0];
  if (!row || row.acceptedAt || row.expiresAt <= new Date()) return null;

  return { siteId: row.siteId, siteName: row.siteName, role: row.role, email: row.email };
}

/**
 * Accepts an invitation for the signed-in user.
 *
 * The invitation is bound to the address it was sent to: accepting it with a
 * different account would let a forwarded mail hand access to the wrong person.
 */
export async function acceptInvitation(input: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<{ siteId: string }> {
  const tokenHash = hashToken(input.token);

  const rows = await getDb()
    .select()
    .from(siteInvitations)
    .where(eq(siteInvitations.tokenHash, tokenHash))
    .limit(1);

  const invitation = rows[0];
  if (!invitation) throw new InvitationError('Diese Einladung gibt es nicht.');
  if (invitation.acceptedAt) throw new InvitationError('Diese Einladung wurde schon eingelöst.');
  if (invitation.expiresAt <= new Date())
    throw new InvitationError('Diese Einladung ist abgelaufen.');

  if (invitation.email !== input.userEmail.trim().toLowerCase()) {
    throw new InvitationError(
      'Diese Einladung wurde an eine andere E-Mail-Adresse geschickt. Melde dich mit dieser Adresse an.',
    );
  }

  await getDb().transaction(async (tx) => {
    await tx
      .insert(siteMembers)
      .values({ siteId: invitation.siteId, userId: input.userId, role: invitation.role })
      .onConflictDoNothing();

    await tx
      .update(siteInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(siteInvitations.id, invitation.id));
  });

  return { siteId: invitation.siteId };
}

export async function changeMemberRole(input: {
  siteId: string;
  userId: string;
  memberId: string;
  role: SiteRole;
}): Promise<void> {
  const site = await requireCapability(input.siteId, input.userId, 'site:members');

  if (!assignableRoles(site.role).includes(input.role)) {
    throw new MemberError('Diese Rolle darfst du nicht vergeben.');
  }

  const owner = await getDb()
    .select({ ownerId: sites.ownerId })
    .from(sites)
    .where(eq(sites.id, input.siteId))
    .limit(1);

  // The owner's own role is not something a member list can change.
  if (owner[0]?.ownerId === input.memberId) {
    throw new MemberError('Die Rolle der Eigentümerin oder des Eigentümers ist fest.');
  }

  const updated = await getDb()
    .update(siteMembers)
    .set({ role: input.role })
    .where(and(eq(siteMembers.siteId, input.siteId), eq(siteMembers.userId, input.memberId)))
    .returning({ userId: siteMembers.userId });

  if (updated.length === 0) throw new MemberError('Mitglied nicht gefunden.');
}

export async function removeMember(input: {
  siteId: string;
  userId: string;
  memberId: string;
}): Promise<void> {
  await requireCapability(input.siteId, input.userId, 'site:members');

  const owner = await getDb()
    .select({ ownerId: sites.ownerId })
    .from(sites)
    .where(eq(sites.id, input.siteId))
    .limit(1);

  if (owner[0]?.ownerId === input.memberId) {
    throw new MemberError('Die Eigentümerin oder der Eigentümer kann nicht entfernt werden.');
  }

  const deleted = await getDb()
    .delete(siteMembers)
    .where(
      and(
        eq(siteMembers.siteId, input.siteId),
        eq(siteMembers.userId, input.memberId),
        ne(siteMembers.userId, owner[0]?.ownerId ?? ''),
      ),
    )
    .returning({ userId: siteMembers.userId });

  if (deleted.length === 0) throw new MemberError('Mitglied nicht gefunden.');
}

export { SiteAccessError };
