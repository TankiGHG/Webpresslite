'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { fieldErrors } from '@/lib/auth/validation';
import {
  acceptInvitation,
  changeMemberRole,
  inviteMember,
  InvitationError,
  MemberError,
  removeMember,
  revokeInvitation,
} from '@/lib/db/queries/members';
import { SiteAccessError } from '@/lib/db/queries/sites';
import { getEnv } from '@/lib/env';
import { sendMail } from '@/lib/mail/mailer';
import { invitationMail } from '@/lib/mail/templates';
import { SITE_ROLES } from '@/lib/sites/roles';
import { ROLE_LABELS } from '@/lib/sites/roles';

export interface ActionState {
  errors?: Record<string, string>;
  formError?: string;
  notice?: string;
}

const inviteSchema = z.object({
  siteId: z.string().min(1),
  email: z.string().trim().toLowerCase().email('Das ist keine gültige E-Mail-Adresse.'),
  role: z.enum(SITE_ROLES),
});

export async function inviteMemberAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const parsed = inviteSchema.safeParse({
    siteId: formData.get('siteId'),
    email: formData.get('email'),
    role: formData.get('role'),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  try {
    const { invitation, token } = await inviteMember({
      siteId: parsed.data.siteId,
      userId: user.id,
      email: parsed.data.email,
      role: parsed.data.role,
    });

    const { getSiteForUser } = await import('@/lib/db/queries/sites');
    const site = await getSiteForUser(parsed.data.siteId, user.id);

    await sendMail(
      invitationMail(
        invitation.email,
        site?.name ?? 'einer Site',
        ROLE_LABELS[invitation.role],
        `${getEnv().APP_URL}/einladung/${token}`,
      ),
    );
  } catch (error) {
    if (error instanceof SiteAccessError) {
      return { formError: 'Zum Einladen brauchst du mindestens die Rolle Administration.' };
    }
    if (error instanceof InvitationError) return { formError: error.message };
    throw error;
  }

  revalidatePath(`/sites/${parsed.data.siteId}/team`);
  return { notice: `Einladung an ${parsed.data.email} verschickt.` };
}

export async function revokeInvitationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  const invitationId = formData.get('invitationId');

  if (typeof siteId !== 'string' || typeof invitationId !== 'string') {
    return { formError: 'Ungültige Anfrage.' };
  }

  try {
    await revokeInvitation({ siteId, userId: user.id, invitationId });
  } catch (error) {
    if (error instanceof SiteAccessError) return { formError: 'Kein Zugriff.' };
    if (error instanceof InvitationError) return { formError: error.message };
    throw error;
  }

  revalidatePath(`/sites/${siteId}/team`);
  return { notice: 'Einladung zurückgezogen.' };
}

export async function changeRoleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  const memberId = formData.get('memberId');
  const role = formData.get('role');

  if (typeof siteId !== 'string' || typeof memberId !== 'string' || typeof role !== 'string') {
    return { formError: 'Ungültige Anfrage.' };
  }

  if (!(SITE_ROLES as readonly string[]).includes(role)) {
    return { formError: 'Unbekannte Rolle.' };
  }

  try {
    await changeMemberRole({
      siteId,
      userId: user.id,
      memberId,
      role: role as (typeof SITE_ROLES)[number],
    });
  } catch (error) {
    if (error instanceof SiteAccessError) return { formError: 'Kein Zugriff.' };
    if (error instanceof MemberError) return { formError: error.message };
    throw error;
  }

  revalidatePath(`/sites/${siteId}/team`);
  return { notice: 'Rolle geändert.' };
}

export async function removeMemberAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  const memberId = formData.get('memberId');

  if (typeof siteId !== 'string' || typeof memberId !== 'string') {
    return { formError: 'Ungültige Anfrage.' };
  }

  try {
    await removeMember({ siteId, userId: user.id, memberId });
  } catch (error) {
    if (error instanceof SiteAccessError) return { formError: 'Kein Zugriff.' };
    if (error instanceof MemberError) return { formError: error.message };
    throw error;
  }

  revalidatePath(`/sites/${siteId}/team`);
  return { notice: 'Mitglied entfernt.' };
}

export async function acceptInvitationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = formData.get('token');
  if (typeof token !== 'string') return { formError: 'Ungültige Anfrage.' };

  const { user } = await requireSession(`/einladung/${token}`);

  let siteId: string;
  try {
    ({ siteId } = await acceptInvitation({ token, userId: user.id, userEmail: user.email }));
  } catch (error) {
    if (error instanceof InvitationError) return { formError: error.message };
    throw error;
  }

  revalidatePath('/dashboard');
  redirect(`/sites/${siteId}`);
}
