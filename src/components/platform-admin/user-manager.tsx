'use client';

import { useActionState, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/auth/field';
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
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Löschen
      </Button>
    );
  }

  return (
    <form action={formAction} className="w-full space-y-3 rounded-md border border-red-200 p-4">
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

      <Field label="Bestätigung" name="confirmation" autoComplete="off" required disabled={pending} />

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
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
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" data-testid="platform-user">
      <div className="min-w-0">
        <p className="font-medium">
          {user.name}
          {isSelf ? (
            <span className="ml-2 rounded-full border px-2 py-0.5 text-xs font-normal">Du</span>
          ) : null}
          {user.isPlatformAdmin ? (
            <span className="ml-2 rounded-full border px-2 py-0.5 text-xs font-normal">
              Platform-Admin
            </span>
          ) : null}
          {banned ? (
            <span className="ml-2 rounded-full border border-red-300 px-2 py-0.5 text-xs font-normal text-red-700">
              Gesperrt
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-[var(--color-muted-foreground)]">
          {user.email} · {user.ownedSiteCount}{' '}
          {user.ownedSiteCount === 1 ? 'eigene Site' : 'eigene Sites'}
        </p>
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
      <ul className="divide-y rounded-lg border" data-testid="platform-user-list">
        {users.map((user) => (
          <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
        ))}
      </ul>
    </section>
  );
}
