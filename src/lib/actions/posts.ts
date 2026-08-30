'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { fieldErrors } from '@/lib/auth/validation';
import { createPost, deletePost, setPostStatus, updatePost } from '@/lib/db/queries/posts';
import { siteContentTag } from '@/lib/db/queries/public-sites';
import { SiteAccessError } from '@/lib/db/queries/sites';
import type { JSONContent } from '@/lib/editor/types';
import { POST_TYPES } from '@/lib/posts/constants';
import { SLUG_PATTERN } from '@/lib/posts/slug';

export interface ActionState {
  errors?: Record<string, string>;
  formError?: string;
}

const createSchema = z.object({
  siteId: z.string().min(1),
  title: z.string().trim().min(1, 'Bitte gib einen Titel ein.').max(200, 'Höchstens 200 Zeichen.'),
  type: z.enum(POST_TYPES),
});

export async function createPostAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const parsed = createSchema.safeParse({
    siteId: formData.get('siteId'),
    title: formData.get('title'),
    type: formData.get('type'),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  let postId: string;
  try {
    const post = await createPost({
      siteId: parsed.data.siteId,
      userId: user.id,
      title: parsed.data.title,
      type: parsed.data.type,
    });
    postId = post.id;
  } catch (error) {
    if (error instanceof SiteAccessError) return { formError: 'Kein Zugriff auf diese Site.' };
    throw error;
  }

  revalidatePath(`/sites/${parsed.data.siteId}/posts`);
  redirect(`/sites/${parsed.data.siteId}/posts/${postId}`);
}

/**
 * Autosave target. Returns a plain result instead of throwing, so a failed save
 * surfaces in the editor's status line rather than as an unhandled rejection.
 */
export async function savePostAction(input: {
  siteId: string;
  postId: string;
  title: string;
  content: JSONContent;
}): Promise<{ ok: true; savedAt: string } | { ok: false; error: string }> {
  const { user } = await requireSession('/dashboard');

  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Der Titel darf nicht leer sein.' };

  try {
    await updatePost({
      siteId: input.siteId,
      postId: input.postId,
      userId: user.id,
      title,
      content: input.content,
    });
  } catch (error) {
    if (error instanceof SiteAccessError) return { ok: false, error: 'Kein Zugriff.' };
    return { ok: false, error: 'Speichern fehlgeschlagen.' };
  }

  revalidateTag(siteContentTag(input.siteId));

  return { ok: true, savedAt: new Date().toISOString() };
}

const settingsSchema = z.object({
  siteId: z.string().min(1),
  postId: z.string().min(1),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Bitte gib einen Slug ein.')
    .regex(SLUG_PATTERN, 'Nur Kleinbuchstaben, Ziffern und Bindestriche.'),
  excerpt: z.string().trim().max(300, 'Höchstens 300 Zeichen.'),
  seoTitle: z.string().trim().max(70, 'Höchstens 70 Zeichen.'),
  seoDescription: z.string().trim().max(160, 'Höchstens 160 Zeichen.'),
});

export async function savePostSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const parsed = settingsSchema.safeParse({
    siteId: formData.get('siteId'),
    postId: formData.get('postId'),
    slug: formData.get('slug'),
    excerpt: formData.get('excerpt') ?? '',
    seoTitle: formData.get('seoTitle') ?? '',
    seoDescription: formData.get('seoDescription') ?? '',
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  try {
    await updatePost({
      siteId: parsed.data.siteId,
      postId: parsed.data.postId,
      userId: user.id,
      slug: parsed.data.slug,
      excerpt: parsed.data.excerpt || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
    });
  } catch (error) {
    if (error instanceof SiteAccessError) return { formError: 'Kein Zugriff auf diese Site.' };
    throw error;
  }

  revalidateTag(siteContentTag(parsed.data.siteId));
  revalidatePath(`/sites/${parsed.data.siteId}/posts/${parsed.data.postId}`);
  return {};
}

const statusSchema = z.object({
  siteId: z.string().min(1),
  postId: z.string().min(1),
  intent: z.enum(['publish', 'unpublish', 'schedule']),
  scheduledFor: z.string().optional(),
});

export async function changePostStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const parsed = statusSchema.safeParse({
    siteId: formData.get('siteId'),
    postId: formData.get('postId'),
    intent: formData.get('intent'),
    scheduledFor: formData.get('scheduledFor') ?? undefined,
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { siteId, postId, intent } = parsed.data;

  try {
    if (intent === 'publish') {
      await setPostStatus(siteId, postId, user.id, 'published');
    } else if (intent === 'unpublish') {
      await setPostStatus(siteId, postId, user.id, 'draft');
    } else {
      const when = parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null;
      if (!when || Number.isNaN(when.getTime())) {
        return { errors: { scheduledFor: 'Bitte gib einen gültigen Zeitpunkt an.' } };
      }
      if (when.getTime() <= Date.now()) {
        return { errors: { scheduledFor: 'Der Zeitpunkt muss in der Zukunft liegen.' } };
      }
      await setPostStatus(siteId, postId, user.id, 'scheduled', when);
    }
  } catch (error) {
    if (error instanceof SiteAccessError) return { formError: 'Kein Zugriff auf diese Site.' };
    throw error;
  }

  revalidateTag(siteContentTag(siteId));
  revalidatePath(`/sites/${siteId}/posts/${postId}`);
  revalidatePath(`/sites/${siteId}/posts`);
  return {};
}

export async function deletePostAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  const postId = formData.get('postId');

  if (typeof siteId !== 'string' || typeof postId !== 'string') {
    return { formError: 'Ungültige Anfrage.' };
  }

  try {
    await deletePost(siteId, postId, user.id);
  } catch (error) {
    if (error instanceof SiteAccessError) {
      return { formError: 'Zum Löschen brauchst du mindestens die Rolle Redaktion.' };
    }
    throw error;
  }

  revalidateTag(siteContentTag(siteId));
  revalidatePath(`/sites/${siteId}/posts`);
  redirect(`/sites/${siteId}/posts`);
}
