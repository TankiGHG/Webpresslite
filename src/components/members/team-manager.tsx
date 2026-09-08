'use client';

import { Mail, Send, UserMinus, X } from 'lucide-react';
import { useActionState } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  changeRoleAction,
  inviteMemberAction,
  removeMemberAction,
  revokeInvitationAction,
  type ActionState,
} from '@/lib/actions/members';
import type { Member, PendingInvitation } from '@/lib/db/queries/members';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS, type SiteRole } from '@/lib/sites/roles';

function RoleSelect({
  name,
  defaultValue,
  options,
  id,
  ariaLabel,
}: {
  name: string;
  defaultValue?: SiteRole;
  options: SiteRole[];
  id?: string;
  ariaLabel?: string;
}) {
  return (
    <Select
      id={id}
      name={name}
      defaultValue={defaultValue ?? options[0]}
      aria-label={ariaLabel}
      className="w-40"
    >
      {options.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </Select>
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
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5" data-testid="member">
      <Avatar name={member.name} seed={member.email} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium">
          <span className="truncate">{member.name}</span>
          {member.isOwner ? <Badge variant="primary">{ROLE_LABELS.owner}</Badge> : null}
        </p>
        <p className="text-muted-foreground truncate text-xs">{member.email}</p>
      </div>

      {member.isOwner ? (
        // The badge next to the name already says it; nothing to change here.
        <span className="text-muted-foreground text-xs">Kann nicht geändert werden</span>
      ) : assignable.length === 0 ? (
        <span className="text-muted-foreground text-sm">{ROLE_LABELS[member.role]}</span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <form action={roleAction} className="flex items-center gap-2">
            <input type="hidden" name="siteId" value={siteId} />
            <input type="hidden" name="memberId" value={member.userId} />
            <RoleSelect
              name="role"
              defaultValue={member.role}
              options={assignable}
              ariaLabel={`Rolle von ${member.name}`}
            />
            <Button type="submit" size="sm" variant="outline" loading={rolePending}>
              Rolle setzen
            </Button>
          </form>

          <form action={removeAction}>
            <input type="hidden" name="siteId" value={siteId} />
            <input type="hidden" name="memberId" value={member.userId} />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="text-danger hover:text-danger"
              loading={removePending}
            >
              {removePending ? null : <UserMinus />}
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
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5" data-testid="invitation">
      <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-full">
        <Mail className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{invitation.email}</p>
        <p className="text-muted-foreground text-xs">
          {ROLE_LABELS[invitation.role]} · gültig bis {formatDate(invitation.expiresAt)}
        </p>
      </div>

      <form action={formAction}>
        <input type="hidden" name="siteId" value={siteId} />
        <input type="hidden" name="invitationId" value={invitation.id} />
        <Button type="submit" size="sm" variant="ghost" loading={pending}>
          {pending ? null : <X />}
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mitglieder</CardTitle>
            <CardDescription>
              {members.length === 1 ? 'Eine Person' : `${members.length} Personen`} mit Zugang zu
              dieser Site.
            </CardDescription>
          </CardHeader>
          <ul className="divide-y border-t" data-testid="member-list">
            {members.map((member) => (
              <MemberRow
                key={member.userId}
                siteId={siteId}
                member={member}
                assignable={assignable}
              />
            ))}
          </ul>
        </Card>

        {invitations.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Offene Einladungen</CardTitle>
              <CardDescription>
                Noch nicht angenommen; ein Platz ist trotzdem reserviert.
              </CardDescription>
            </CardHeader>
            <ul className="divide-y border-t" data-testid="invitation-list">
              {invitations.map((invitation) => (
                <InvitationRow key={invitation.id} siteId={siteId} invitation={invitation} />
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      {assignable.length > 0 ? (
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Einladen</CardTitle>
            <CardDescription>
              {full
                ? 'Alle Plätze sind belegt. Entferne jemanden oder wechsle den Plan.'
                : `${seatLimit - seatsUsed} ${seatLimit - seatsUsed === 1 ? 'Platz' : 'Plätze'} frei.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="siteId" value={siteId} />

              {state.formError ? <Alert>{state.formError}</Alert> : null}
              {state.notice ? <Alert variant="success">{state.notice}</Alert> : null}

              <Field
                label="E-Mail"
                name="email"
                type="email"
                required
                placeholder="name@example.de"
                error={state.errors?.email}
                disabled={pending || full}
              />

              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Rolle</Label>
                <RoleSelect id="invite-role" name="role" options={assignable} />
              </div>

              <Button type="submit" loading={pending} disabled={full} className="w-full">
                {pending ? null : <Send />}
                {pending ? 'Wird verschickt…' : 'Einladen'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
