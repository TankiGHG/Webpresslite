'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { siteTag } from '@/lib/db/queries/public-sites';
import {
  DomainError,
  getSiteForUser,
  markDomainVerified,
  setCustomDomain,
  setSitePlan,
  SiteAccessError,
} from '@/lib/db/queries/sites';
import { customDomainSchema } from '@/lib/domains/validation';
import { verifyDomainOwnership } from '@/lib/domains/verify';
import { invalidateHostCache } from '@/lib/tenant/resolve';
import { billing } from '@/lib/billing/stub';
import { SITE_PLANS } from '@/lib/sites/roles';
import { revalidateTag } from 'next/cache';

export interface ActionState {
  errors?: Record<string, string>;
  formError?: string;
  notice?: string;
  found?: string[];
}

export async function setDomainAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  if (typeof siteId !== 'string') return { formError: 'Ungültige Anfrage.' };

  const raw = formData.get('domain');
  const value = typeof raw === 'string' ? raw.trim() : '';

  // An empty field removes the domain again.
  if (value === '') {
    try {
      await setCustomDomain({ siteId, userId: user.id, domain: null });
    } catch (error) {
      if (error instanceof SiteAccessError) return { formError: 'Kein Zugriff.' };
      if (error instanceof DomainError) return { formError: error.message };
      throw error;
    }

    invalidateHostCache();
    revalidateTag(siteTag(siteId));
    revalidatePath(`/sites/${siteId}/domain`);
    return { notice: 'Domain entfernt.' };
  }

  const parsed = customDomainSchema.safeParse(value);
  if (!parsed.success) {
    return { errors: { domain: parsed.error.issues[0]?.message ?? 'Ungültige Domain.' } };
  }

  try {
    await setCustomDomain({ siteId, userId: user.id, domain: parsed.data });
  } catch (error) {
    if (error instanceof SiteAccessError) {
      return { formError: 'Nur die Eigentümerin oder der Eigentümer darf die Domain ändern.' };
    }
    if (error instanceof DomainError) return { formError: error.message };
    throw error;
  }

  invalidateHostCache();
  revalidateTag(siteTag(siteId));
  revalidatePath(`/sites/${siteId}/domain`);
  return { notice: 'Domain gespeichert. Trage jetzt den TXT-Eintrag ein und prüfe ihn.' };
}

export async function verifyDomainAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  if (typeof siteId !== 'string') return { formError: 'Ungültige Anfrage.' };

  const site = await getSiteForUser(siteId, user.id);
  if (!site) return { formError: 'Kein Zugriff.' };
  if (!site.customDomain || !site.domainVerificationToken) {
    return { formError: 'Für diese Site ist keine Domain hinterlegt.' };
  }

  const result = await verifyDomainOwnership(site.customDomain, site.domainVerificationToken);

  if (!result.verified) {
    return { formError: result.reason, found: result.found };
  }

  try {
    await markDomainVerified(siteId, user.id);
  } catch (error) {
    if (error instanceof SiteAccessError) return { formError: 'Kein Zugriff.' };
    throw error;
  }

  // Only now may the middleware resolve the host to this site.
  invalidateHostCache();
  revalidateTag(siteTag(siteId));
  revalidatePath(`/sites/${siteId}/domain`);
  return { notice: 'Domain verifiziert. Die Site ist jetzt darunter erreichbar.' };
}

export async function changePlanAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  const plan = formData.get('plan');

  if (typeof siteId !== 'string' || typeof plan !== 'string') {
    return { formError: 'Ungültige Anfrage.' };
  }

  if (!(SITE_PLANS as readonly string[]).includes(plan)) {
    return { formError: 'Unbekannter Plan.' };
  }

  const target = plan as (typeof SITE_PLANS)[number];

  // No money changes hands: the stub stands in for a payment provider and the
  // plan on the site is what everything else enforces.
  const checkout = await billing.startCheckout({ siteId, plan: target });

  try {
    await setSitePlan({ siteId, userId: user.id, plan: target });
  } catch (error) {
    if (error instanceof SiteAccessError) {
      return { formError: 'Nur die Eigentümerin oder der Eigentümer darf den Plan ändern.' };
    }
    throw error;
  }

  revalidateTag(siteTag(siteId));
  revalidatePath(`/sites/${siteId}/plan`);
  return {
    notice: `Plan auf ${target} gesetzt (Stub-Abrechnung über ${checkout.provider}, es wird nichts berechnet).`,
  };
}
