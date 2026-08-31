'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { acceptInvitationAction, type ActionState } from '@/lib/actions/members';

export function AcceptInvitation({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    acceptInvitationAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {state.formError ? <Alert>{state.formError}</Alert> : null}
      <Button type="submit" disabled={pending} data-testid="accept-invitation">
        {pending ? 'Wird angenommen…' : 'Einladung annehmen'}
      </Button>
    </form>
  );
}
