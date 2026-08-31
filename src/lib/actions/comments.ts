'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { fieldErrors } from '@/lib/auth/validation';
import { COMMENT_STATUSES, HONEYPOT_FIELD } from '@/lib/comments/constants';
import { commentSchema, looksLikeSpam } from '@/lib/comments/validation';
import {
  CommentNotFoundError,
  countRecentByIp,
  deleteComment,
  hashIp,
  setCommentStatus,
  submitComment,
} from '@/lib/db/queries/comments';
import { siteContentTag } from '@/lib/db/queries/public-sites';
import { SiteAccessError } from '@/lib/db/queries/sites';
import { getEnv } from '@/lib/env';

export interface CommentFormState {
  errors?: Record<string, string>;
  formError?: string;
  submitted?: boolean;
}

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

/** Best effort client address; behind the proxy the forwarded header wins. */
async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headerList.get('x-real-ip');
}

export async function submitCommentAction(
  _previous: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const siteId = formData.get('siteId');
  const postSlug = formData.get('postSlug');

  if (typeof siteId !== 'string' || typeof postSlug !== 'string') {
    return { formError: 'Ungültige Anfrage.' };
  }

  // Honeypot: a hidden field only an automated client fills in. The response
  // is deliberately the same as for a real submission, so a bot learns nothing.
  const honeypot = formData.get(HONEYPOT_FIELD);
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return { submitted: true };
  }

  const parsed = commentSchema.safeParse({
    authorName: formData.get('authorName'),
    authorEmail: formData.get('authorEmail'),
    body: formData.get('body'),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const ip = await clientIp();
  const ipHash = ip ? hashIp(ip, getEnv().AUTH_SECRET) : null;

  if (ipHash) {
    const recent = await countRecentByIp(siteId, ipHash, new Date(Date.now() - RATE_WINDOW_MS));
    if (recent >= RATE_MAX) {
      return { formError: 'Du hast gerade viele Kommentare geschrieben. Bitte warte etwas.' };
    }
  }

  try {
    const comment = await submitComment({
      siteId,
      postSlug,
      authorName: parsed.data.authorName,
      authorEmail: parsed.data.authorEmail,
      body: parsed.data.body,
      ipHash,
    });

    // Obvious spam goes straight to the spam queue. It is still not public —
    // it just does not clutter the moderator's pending list.
    if (looksLikeSpam(parsed.data)) {
      await markAsSpam(siteId, comment.id);
    }
  } catch (error) {
    if (error instanceof CommentNotFoundError) return { formError: 'Beitrag nicht gefunden.' };
    throw error;
  }

  return { submitted: true };
}

/** Internal: bypasses the moderator check, used only by the spam heuristic. */
async function markAsSpam(siteId: string, commentId: string): Promise<void> {
  const { getDb } = await import('@/lib/db/client');
  const { comments } = await import('@/lib/db/schema');
  const { and, eq } = await import('drizzle-orm');

  await getDb()
    .update(comments)
    .set({ status: 'spam' })
    .where(and(eq(comments.siteId, siteId), eq(comments.id, commentId)));
}

export interface ModerationState {
  formError?: string;
  done?: boolean;
}

export async function moderateCommentAction(
  _previous: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const { user } = await requireSession('/dashboard');

  const siteId = formData.get('siteId');
  const commentId = formData.get('commentId');
  const intent = formData.get('intent');

  if (typeof siteId !== 'string' || typeof commentId !== 'string' || typeof intent !== 'string') {
    return { formError: 'Ungültige Anfrage.' };
  }

  try {
    if (intent === 'delete') {
      await deleteComment({ siteId, userId: user.id, commentId });
    } else if ((COMMENT_STATUSES as readonly string[]).includes(intent)) {
      await setCommentStatus({
        siteId,
        userId: user.id,
        commentId,
        status: intent as (typeof COMMENT_STATUSES)[number],
      });
    } else {
      return { formError: 'Unbekannte Aktion.' };
    }
  } catch (error) {
    if (error instanceof SiteAccessError) {
      return { formError: 'Zum Moderieren brauchst du mindestens die Rolle Redaktion.' };
    }
    if (error instanceof CommentNotFoundError) return { formError: 'Kommentar nicht gefunden.' };
    throw error;
  }

  // An approved comment shows up on the public page immediately.
  revalidateTag(siteContentTag(siteId));
  revalidatePath(`/sites/${siteId}/kommentare`);

  return { done: true };
}
