'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { fieldErrors } from '@/lib/auth/validation';
import { siteContentTag } from '@/lib/db/queries/public-sites';
import { SiteAccessError } from '@/lib/db/queries/sites';
import {
  createCategory,
  deleteCategory,
  pruneUnusedTags,
  setPostCategory,
  setPostTags,
  TaxonomyNotFoundError,
} from '@/lib/db/queries/taxonomies';

export interface ActionState {
  errors?: Record<string, string>;
  formError?: string;
  saved?: boolean;
}

const categorySchema = z.object({
  siteId: z.string().min(1),
  name: z.string().trim().min(2, 'Mindestens 2 Zeichen.').max(60, 'Höchstens 60 Zeichen.'),
  description: z.string().trim().max(300, 'Höchstens 300 Zeichen.'),
});

export async function createCategoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const parsed = categorySchema.safeParse({
    siteId: formData.get('siteId'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  try {
    await createCategory({
      siteId: parsed.data.siteId,
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
    });
  } catch (error) {
    if (error instanceof SiteAccessError) {
      return { formError: 'Zum Anlegen brauchst du mindestens die Rolle Redaktion.' };
    }
    throw error;
  }

  revalidateTag(siteContentTag(parsed.data.siteId));
  revalidatePath(`/sites/${parsed.data.siteId}/taxonomien`);
  return { saved: true };
}

export async function deleteCategoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  const categoryId = formData.get('categoryId');

  if (typeof siteId !== 'string' || typeof categoryId !== 'string') {
    return { formError: 'Ungültige Anfrage.' };
  }

  try {
    await deleteCategory({ siteId, userId: user.id, categoryId });
  } catch (error) {
    if (error instanceof SiteAccessError) {
      return { formError: 'Zum Löschen brauchst du mindestens die Rolle Redaktion.' };
    }
    if (error instanceof TaxonomyNotFoundError) return { formError: 'Kategorie nicht gefunden.' };
    throw error;
  }

  revalidateTag(siteContentTag(siteId));
  revalidatePath(`/sites/${siteId}/taxonomien`);
  return { saved: true };
}

export async function pruneTagsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  if (typeof siteId !== 'string') return { formError: 'Ungültige Anfrage.' };

  try {
    await pruneUnusedTags(siteId, user.id);
  } catch (error) {
    if (error instanceof SiteAccessError) {
      return { formError: 'Zum Aufräumen brauchst du mindestens die Rolle Redaktion.' };
    }
    throw error;
  }

  revalidatePath(`/sites/${siteId}/taxonomien`);
  return { saved: true };
}

const assignSchema = z.object({
  siteId: z.string().min(1),
  postId: z.string().min(1),
  categoryId: z.string(),
  tags: z.string(),
});

export async function assignTaxonomiesAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const parsed = assignSchema.safeParse({
    siteId: formData.get('siteId'),
    postId: formData.get('postId'),
    categoryId: formData.get('categoryId') ?? '',
    tags: formData.get('tags') ?? '',
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const tagNames = parsed.data.tags
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 25);

  try {
    await setPostCategory({
      siteId: parsed.data.siteId,
      userId: user.id,
      postId: parsed.data.postId,
      categoryId: parsed.data.categoryId || null,
    });

    await setPostTags({
      siteId: parsed.data.siteId,
      userId: user.id,
      postId: parsed.data.postId,
      tagNames,
    });
  } catch (error) {
    if (error instanceof SiteAccessError) return { formError: 'Kein Zugriff auf diese Site.' };
    if (error instanceof TaxonomyNotFoundError) {
      return { errors: { categoryId: 'Diese Kategorie gibt es nicht.' } };
    }
    throw error;
  }

  revalidateTag(siteContentTag(parsed.data.siteId));
  revalidatePath(`/sites/${parsed.data.siteId}/posts/${parsed.data.postId}`);
  return { saved: true };
}
