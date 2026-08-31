'use client';

import { useActionState } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  changeRoleAction,
  inviteMemberAction,
  removeMemberAction,
  revokeInvitationAction,
  type ActionState,
} from '@/lib/actions/members';
import type { Member, PendingInvitation } from '@/lib/db/queries/members';
import { ROLE_LABELS, type SiteRole } from '@/lib/sites/roles';

function RoleSelect({
  name,
  defaultValue,
  options,
  id,
}: {
  name: string;
  defaultValue?: SiteRole;
  options: SiteRole[];
  id?: string;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue ?? options[0]}
      className="h-9 rounded-md border bg-transparent px-2 text-sm"
    >
      {options.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}

function MemberRow({
  siteId,
  member,
  assignable,
}: {
  siteId: string;
  member: Member;
  assignable: SiteRole[];
}) {
  const [roleState, roleAction, rolePending] = useActionState<ActionState, FormData>(
    changeRoleAction,
    {},
  );
  const [removeState, removeAction, removePending] = useActionState<ActionState, FormData>(
    removeMemberAction,
    {},
  );

  return (
    <li
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
      data-testid="member"
    >
      <div className="min-w-0">
        <p className="font-medium">
          {member.name}
          {member.isOwner ? (
            <span className="ml-2 rounded-full border px-2 py-0.5 text-xs font-normal">
              {ROLE_LABELS.owner}
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-[var(--color-muted-foreground)]">{member.email}</p>
      </div>

      {member.isOwner || assignable.length === 0 ? (
        <span className="text-sm text-[var(--color-muted-foreground)]">
          {ROLE_LABELS[member.role]}
        </span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <form action={roleAction} className="flex items-center gap-2">
            <input type="hidden" name="siteId" value={siteId} />
            <input type="hidden" name="memberId" value={member.userId} />
            <span className="sr-only">Rolle von {member.name}</span>
            <RoleSelect name="role" defaultValue={member.role} options={assignable} />
            <Button type="submit" size="sm" variant="outline" disabled={rolePending}>
              Rolle setzen
            </Button>
          </form>

          <form action={removeAction}>
            <input type="hidden" name="siteId" value={siteId} />
            <input type="hidden" name="memberId" value={member.userId} />
            <Button type="submit" size="sm" variant="ghost" disabled={removePending}>
              Entfernen
            </Button>
          </form>
        </div>
      )}

      {/* A silent success leaves the reader guessing whether it worked. */}
      {roleState.formError || roleState.notice ? (
        <div className="w-full">
          <Alert variant={roleState.formError ? 'error' : 'success'}>
            {roleState.formError ?? roleState.notice}
          </Alert>
        </div>
      ) : null}
      {removeState.formError ? (
        <div className="w-full">
          <Alert>{removeState.formError}</Alert>
        </div>
      ) : null}
    </li>
  );
}

function InvitationRow({ siteId, invitation }: { siteId: string; invitation: PendingInvitation }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    revokeInvitationAction,
    {},
  );

  return (
    <li
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
      data-testid="invitation"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{invitation.email}</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {ROLE_LABELS[invitation.role]} · gültig bis{' '}
          {invitation.expiresAt.toLocaleDateString('de-DE')}
        </p>
      </div>

      <form action={formAction}>
        <input type="hidden" name="siteId" value={siteId} />
        <input type="hidden" name="invitationId" value={invitation.id} />
        <Button type="submit" size="sm" variant="ghost" disabled={pending}>
          Zurückziehen
        </Button>
      </form>

      {state.formError || state.notice ? (
        <div className="w-full">
          <Alert variant={state.formError ? 'error' : 'success'}>
            {state.formError ?? state.notice}
          </Alert>
        </div>
      ) : null}
    </li>
  );
}

export function TeamManager({
  siteId,
  members,
  invitations,
  assignable,
  seatsUsed,
  seatLimit,
}: {
  siteId: string;
  members: Member[];
  invitations: PendingInvitation[];
  assignable: SiteRole[];
  seatsUsed: number;
  seatLimit: number;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    inviteMemberAction,
    {},
  );

  const full = seatsUsed >= seatLimit;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-medium">Mitglieder</h2>
        <ul className="divide-y rounded-lg border" data-testid="member-list">
          {members.map((member) => (
            <MemberRow
              key={member.userId}
              siteId={siteId}
              member={member}
              assignable={assignable}
            />
          ))}
        </ul>
      </section>

      {invitations.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-medium">Offene Einladungen</h2>
          <ul className="divide-y rounded-lg border" data-testid="invitation-list">
            {invitations.map((invitation) => (
              <InvitationRow key={invitation.id} siteId={siteId} invitation={invitation} />
            ))}
          </ul>
        </section>
      ) : null}

      {assignable.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-medium">Einladen</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {seatsUsed} von {seatLimit} Plätzen belegt.
          </p>

          {state.formError ? <Alert>{state.formError}</Alert> : null}
          {state.notice ? <Alert variant="success">{state.notice}</Alert> : null}

          <form action={formAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="siteId" value={siteId} />

            <div className="min-w-64 flex-1">
              <Field
                label="E-Mail"
                name="email"
                type="email"
                required
                error={state.errors?.email}
                disabled={pending || full}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Rolle</Label>
              <RoleSelect id="invite-role" name="role" options={assignable} />
            </div>

            <Button type="submit" disabled={pending || full}>
              {pending ? 'Wird verschickt…' : 'Einladen'}
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
