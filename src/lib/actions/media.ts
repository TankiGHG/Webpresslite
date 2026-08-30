'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import {
  deleteMedia,
  finishUpload,
  listMedia,
  startUpload,
  updateAltText,
  UploadRejectedError,
  type MediaItem,
} from '@/lib/db/queries/media';
import { siteContentTag } from '@/lib/db/queries/public-sites';
import { SiteAccessError } from '@/lib/db/queries/sites';
import { consumeUploadSlot } from '@/lib/media/rate-limit';

export type MediaListResult = { ok: true; media: MediaItem[] } | { ok: false; error: string };

/** Backs the picker dialog, which loads the library on demand. */
export async function listMediaAction(siteId: string): Promise<MediaListResult> {
  const { user } = await requireSession('/dashboard');

  try {
    return { ok: true, media: await listMedia(siteId, user.id) };
  } catch (error) {
    if (error instanceof SiteAccessError)
      return { ok: false, error: 'Kein Zugriff auf diese Site.' };
    throw error;
  }
}

export type UploadTicket =
  | { ok: true; mediaId: string; uploadUrl: string; expiresIn: number }
  | { ok: false; error: string };

export async function requestUploadAction(input: {
  siteId: string;
  fileName: string;
  mimeType: string;
  size: number;
}): Promise<UploadTicket> {
  const { user } = await requireSession('/dashboard');

  const limit = consumeUploadSlot(user.id);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Zu viele Uploads. Bitte warte ${limit.retryAfterSeconds} Sekunden.`,
    };
  }

  try {
    const ticket = await startUpload({ ...input, userId: user.id });
    return { ok: true, ...ticket };
  } catch (error) {
    if (error instanceof UploadRejectedError) return { ok: false, error: error.message };
    if (error instanceof SiteAccessError)
      return { ok: false, error: 'Kein Zugriff auf diese Site.' };
    throw error;
  }
}

export type UploadResult = { ok: true; media: MediaItem } | { ok: false; error: string };

export async function completeUploadAction(input: {
  siteId: string;
  mediaId: string;
}): Promise<UploadResult> {
  const { user } = await requireSession('/dashboard');

  try {
    const item = await finishUpload({ ...input, userId: user.id });
    revalidatePath(`/sites/${input.siteId}/medien`);
    return { ok: true, media: item };
  } catch (error) {
    if (error instanceof UploadRejectedError) return { ok: false, error: error.message };
    if (error instanceof SiteAccessError)
      return { ok: false, error: 'Kein Zugriff auf diese Site.' };
    return { ok: false, error: 'Die Verarbeitung ist fehlgeschlagen.' };
  }
}

export interface ActionState {
  errors?: Record<string, string>;
  formError?: string;
  saved?: boolean;
}

export async function updateAltAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  const mediaId = formData.get('mediaId');
  const alt = formData.get('alt');

  if (typeof siteId !== 'string' || typeof mediaId !== 'string') {
    return { formError: 'Ungültige Anfrage.' };
  }

  const text = typeof alt === 'string' ? alt.trim() : '';
  if (text.length > 200) {
    return { errors: { alt: 'Höchstens 200 Zeichen.' } };
  }

  try {
    await updateAltText({ siteId, mediaId, userId: user.id, alt: text === '' ? null : text });
  } catch (error) {
    if (error instanceof SiteAccessError) return { formError: 'Kein Zugriff auf diese Site.' };
    throw error;
  }

  // Alt texts are baked into rendered post HTML, so published pages change too.
  revalidateTag(siteContentTag(siteId));
  revalidatePath(`/sites/${siteId}/medien`);

  return { saved: true };
}

export async function deleteMediaAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  const mediaId = formData.get('mediaId');

  if (typeof siteId !== 'string' || typeof mediaId !== 'string') {
    return { formError: 'Ungültige Anfrage.' };
  }

  try {
    await deleteMedia({ siteId, mediaId, userId: user.id });
  } catch (error) {
    if (error instanceof SiteAccessError) {
      return { formError: 'Zum Löschen brauchst du mindestens die Rolle Redaktion.' };
    }
    throw error;
  }

  revalidateTag(siteContentTag(siteId));
  revalidatePath(`/sites/${siteId}/medien`);

  return { saved: true };
}
