'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import {
  createSite,
  deleteSite,
  isSubdomainAvailable,
  SiteAccessError,
  SubdomainTakenError,
} from '@/lib/db/queries/sites';
import { invalidateHostCache } from '@/lib/tenant/resolve';
import { createSiteSchema, subdomainSchema } from '@/lib/tenant/validation';
import { fieldErrors } from '@/lib/auth/validation';

export interface ActionState {
  errors?: Record<string, string>;
  formError?: string;
}

export async function createSiteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const parsed = createSiteSchema.safeParse({
    name: formData.get('name'),
    subdomain: formData.get('subdomain'),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  try {
    await createSite({ ...parsed.data, ownerId: user.id });
  } catch (error) {
    if (error instanceof SubdomainTakenError) {
      return { errors: { subdomain: 'Diese Subdomain ist schon vergeben.' } };
    }
    throw error;
  }

  // A new subdomain must not stay a cached 404 for the next half minute.
  invalidateHostCache();
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function deleteSiteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  const confirmation = formData.get('confirmation');
  const expected = formData.get('subdomain');

  if (typeof siteId !== 'string' || typeof expected !== 'string') {
    return { formError: 'Ungültige Anfrage.' };
  }

  if (confirmation !== expected) {
    return { errors: { confirmation: `Bitte tippe „${expected}" zur Bestätigung ein.` } };
  }

  try {
    await deleteSite(siteId, user.id);
  } catch (error) {
    if (error instanceof SiteAccessError) {
      return { formError: 'Nur die Eigentümerin oder der Eigentümer darf eine Site löschen.' };
    }
    throw error;
  }

  invalidateHostCache();
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

/** Live availability check for the create form. */
export async function checkSubdomainAction(
  value: string,
): Promise<{ available: boolean; reason?: string }> {
  await requireSession('/dashboard');

  const parsed = subdomainSchema.safeParse(value);
  if (!parsed.success) {
    return { available: false, reason: parsed.error.issues[0]?.message ?? 'Ungültige Subdomain.' };
  }

  const available = await isSubdomainAvailable(parsed.data);
  return available ? { available: true } : { available: false, reason: 'Schon vergeben.' };
}
