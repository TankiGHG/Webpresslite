'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import {
  deleteUserAccount,
  PlatformAccessError,
  PlatformUserError,
  setPlatformAdmin,
  setUserBanned,
} from '@/lib/db/queries/platform-users';

export interface ActionState {
  formError?: string;
  notice?: string;
}

function requiredString(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function setPlatformAdminAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/admin/users');

  const targetUserId = requiredString(formData.get('userId'));
  const value = formData.get('value') === 'true';
  if (!targetUserId) return { formError: 'Ungültige Anfrage.' };

  try {
    await setPlatformAdmin(user.id, targetUserId, value);
  } catch (error) {
    if (error instanceof PlatformAccessError) return { formError: 'Kein Zugriff.' };
    if (error instanceof PlatformUserError) return { formError: error.message };
    throw error;
  }

  revalidatePath('/admin/users');
  return { notice: value ? 'Platform-Admin-Rechte vergeben.' : 'Platform-Admin-Rechte entzogen.' };
}

export async function setUserBannedAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/admin/users');

  const targetUserId = requiredString(formData.get('userId'));
  const banned = formData.get('banned') === 'true';
  if (!targetUserId) return { formError: 'Ungültige Anfrage.' };

  try {
    await setUserBanned(user.id, targetUserId, banned);
  } catch (error) {
    if (error instanceof PlatformAccessError) return { formError: 'Kein Zugriff.' };
    if (error instanceof PlatformUserError) return { formError: error.message };
    throw error;
  }

  revalidatePath('/admin/users');
  return { notice: banned ? 'Nutzer gesperrt.' : 'Sperre aufgehoben.' };
}

export async function deleteUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/admin/users');

  const targetUserId = requiredString(formData.get('userId'));
  const confirmation = formData.get('confirmation');
  const expected = requiredString(formData.get('email'));
  if (!targetUserId || !expected) return { formError: 'Ungültige Anfrage.' };

  if (confirmation !== expected) {
    return { formError: `Bitte tippe „${expected}" zur Bestätigung ein.` };
  }

  try {
    await deleteUserAccount(user.id, targetUserId);
  } catch (error) {
    if (error instanceof PlatformAccessError) return { formError: 'Kein Zugriff.' };
    if (error instanceof PlatformUserError) return { formError: error.message };
    throw error;
  }

  revalidatePath('/admin/users');
  return { notice: 'Nutzer und alle Sites, die dieser Person gehörten, wurden gelöscht.' };
}
