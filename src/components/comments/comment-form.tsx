'use client';

import { useActionState } from 'react';
import { submitCommentAction, type CommentFormState } from '@/lib/actions/comments';
import { COMMENT_MAX_LENGTH, HONEYPOT_FIELD } from '@/lib/comments/constants';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="comment-error">{message}</p>;
}

export function CommentForm({ siteId, postSlug }: { siteId: string; postSlug: string }) {
  const [state, formAction, pending] = useActionState<CommentFormState, FormData>(
    submitCommentAction,
    {},
  );

  if (state.submitted) {
    return (
      <p className="comment-notice" role="status" data-testid="comment-submitted">
        Danke! Dein Kommentar wurde übermittelt und erscheint, sobald er freigegeben ist.
      </p>
    );
  }

  return (
    <form action={formAction} className="comment-form" data-testid="comment-form">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="postSlug" value={postSlug} />

      {state.formError ? (
        <p className="comment-error" role="alert">
          {state.formError}
        </p>
      ) : null}

      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <div aria-hidden="true" className="comment-honeypot">
        <label htmlFor={HONEYPOT_FIELD}>Website (bitte leer lassen)</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="comment-row">
        <div>
          <label htmlFor="authorName">Name</label>
          <input id="authorName" name="authorName" required autoComplete="name" />
          <FieldError message={state.errors?.authorName} />
        </div>
        <div>
          <label htmlFor="authorEmail">E-Mail (wird nicht veröffentlicht)</label>
          <input id="authorEmail" name="authorEmail" type="email" required autoComplete="email" />
          <FieldError message={state.errors?.authorEmail} />
        </div>
      </div>

      <div>
        <label htmlFor="body">Kommentar</label>
        <textarea id="body" name="body" rows={5} required maxLength={COMMENT_MAX_LENGTH} />
        <FieldError message={state.errors?.body} />
      </div>

      <button type="submit" disabled={pending} className="comment-submit">
        {pending ? 'Wird gesendet…' : 'Kommentar absenden'}
      </button>

      <p className="comment-hint">Kommentare erscheinen erst nach Freigabe.</p>
    </form>
  );
}
