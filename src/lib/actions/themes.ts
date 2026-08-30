'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { fieldErrors } from '@/lib/auth/validation';
import { siteTag } from '@/lib/db/queries/public-sites';
import { SiteAccessError, updateSiteTheme } from '@/lib/db/queries/sites';
import { updateThemeSchema } from '@/lib/themes/settings';

export interface ActionState {
  errors?: Record<string, string>;
  formError?: string;
  saved?: boolean;
}

/** Empty form fields mean "not set", not "set to an empty string". */
function optional(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? undefined : text;
}

export async function updateThemeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const parsed = updateThemeSchema.safeParse({
    siteId: formData.get('siteId'),
    theme: formData.get('theme'),
    settings: {
      accent: optional(formData.get('accent')),
      background: optional(formData.get('background')),
      foreground: optional(formData.get('foreground')),
      bodyFont: optional(formData.get('bodyFont')),
      headingFont: optional(formData.get('headingFont')),
      logoUrl: optional(formData.get('logoUrl')),
      logoAlt: optional(formData.get('logoAlt')),
    },
  });

  if (!parsed.success) {
    const flat = fieldErrors(parsed.error);
    // Nested paths come back keyed by "settings"; surface the real field.
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.at(-1);
      if (typeof key === 'string') errors[key] = issue.message;
    }
    return { errors: Object.keys(errors).length > 0 ? errors : flat };
  }

  try {
    await updateSiteTheme({
      siteId: parsed.data.siteId,
      userId: user.id,
      theme: parsed.data.theme,
      themeSettings: parsed.data.settings,
    });
  } catch (error) {
    if (error instanceof SiteAccessError) {
      return {
        formError: 'Zum Ändern des Themes brauchst du mindestens die Rolle Administration.',
      };
    }
    throw error;
  }

  revalidateTag(siteTag(parsed.data.siteId));
  revalidatePath(`/sites/${parsed.data.siteId}/design`);

  return { saved: true };
}
