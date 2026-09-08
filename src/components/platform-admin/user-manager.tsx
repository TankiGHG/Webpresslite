'use client';

import { useActionState, useState } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  deleteUserAction,
  setPlatformAdminAction,
  setUserBannedAction,
  type ActionState,
} from '@/lib/actions/platform-users';
import type { PlatformUserRow } from '@/lib/db/queries/platform-users';

function DeleteUserForm({ user }: { user: PlatformUserRow }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteUserAction, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-danger hover:bg-danger-soft hover:text-danger"
        onClick={() => setOpen(true)}
      >
        Löschen
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="border-danger/40 bg-danger-soft/40 w-full space-y-3 rounded-lg border p-4"
    >
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="email" value={user.email} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}

      <p className="text-sm">
        Löscht <strong>{user.email}</strong>
        {user.ownedSiteCount > 0 ? (
          <>
            {' '}
            und alle <strong>{user.ownedSiteCount}</strong> Site(s), die dieser Person gehören,
            mitsamt ihren Inhalten
          </>
        ) : null}
        . Das lässt sich nicht rückgängig machen. Tippe zur Bestätigung{' '}
        <span className="font-mono">{user.email}</span> ein.
      </p>

      <Field
        label="Bestätigung"
        name="confirmation"
        autoComplete="off"
        required
        disabled={pending}
      />

      <div className="flex gap-2">
        <Button type="submit" variant="danger" loading={pending}>
          {pending ? 'Wird gelöscht…' : 'Endgültig löschen'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

function UserRow({ user, isSelf }: { user: PlatformUserRow; isSelf: boolean }) {
  const [adminState, adminAction, adminPending] = useActionState<ActionState, FormData>(
    setPlatformAdminAction,
    {},
  );
  const [banState, banAction, banPending] = useActionState<ActionState, FormData>(
    setUserBannedAction,
    {},
  );

  const banned = Boolean(user.bannedAt);

  return (
    <li
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
      data-testid="platform-user"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={user.name} seed={user.email} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {user.name}
            {isSelf ? <Badge variant="outline">Du</Badge> : null}
            {user.isPlatformAdmin ? <Badge variant="primary">Platform-Admin</Badge> : null}
            {banned ? <Badge variant="danger">Gesperrt</Badge> : null}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {user.email} · {user.ownedSiteCount}{' '}
            {user.ownedSiteCount === 1 ? 'eigene Site' : 'eigene Sites'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action={adminAction}>
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="value" value={String(!user.isPlatformAdmin)} />
          <Button type="submit" size="sm" variant="outline" disabled={adminPending}>
            {user.isPlatformAdmin ? 'Admin-Rechte entziehen' : 'Zum Admin machen'}
          </Button>
        </form>

        {!isSelf ? (
          <form action={banAction}>
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="banned" value={String(!banned)} />
            <Button type="submit" size="sm" variant="outline" disabled={banPending}>
              {banned ? 'Entsperren' : 'Sperren'}
            </Button>
          </form>
        ) : null}

        {!isSelf ? <DeleteUserForm user={user} /> : null}
      </div>

      {adminState.formError ? (
        <div className="w-full">
          <Alert>{adminState.formError}</Alert>
        </div>
      ) : null}
      {banState.formError ? (
        <div className="w-full">
          <Alert>{banState.formError}</Alert>
        </div>
      ) : null}
    </li>
  );
}

export function UserManager({
  users,
  currentUserId,
}: {
  users: PlatformUserRow[];
  currentUserId: string;
}) {
  return (
    <section className="space-y-3">
      <ul
        className="bg-card divide-y rounded-xl border shadow-[var(--shadow-card)]"
        data-testid="platform-user-list"
      >
        {users.map((user) => (
          <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
        ))}
      </ul>
    </section>
  );
}
