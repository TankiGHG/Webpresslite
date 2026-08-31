import Link from 'next/link';
import type { Metadata } from 'next';
import { AcceptInvitation } from '@/components/members/accept-invitation';
import { Alert } from '@/components/ui/alert';
import { requireSession } from '@/lib/auth/session';
import { previewInvitation } from '@/lib/db/queries/members';
import { ROLE_LABELS } from '@/lib/sites/roles';

export const metadata: Metadata = { title: 'Einladung — webpresslite' };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Signing in first means the invitation is always accepted by a known
  // account, and the address can be checked against the one it was sent to.
  const { user } = await requireSession(`/einladung/${token}`);
  const invitation = await previewInvitation(token);

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Einladung</h1>

        {!invitation ? (
          <>
            <Alert>Diese Einladung ist ungültig, abgelaufen oder schon eingelöst.</Alert>
            <p className="text-sm">
              <Link href="/dashboard" className="underline underline-offset-4">
                Zum Dashboard
              </Link>
            </p>
          </>
        ) : invitation.email !== user.email.toLowerCase() ? (
          <>
            <Alert>
              Diese Einladung wurde an <strong>{invitation.email}</strong> geschickt, du bist aber
              als <strong>{user.email}</strong> angemeldet. Melde dich mit der eingeladenen Adresse
              an.
            </Alert>
            <p className="text-sm">
              <Link href="/dashboard" className="underline underline-offset-4">
                Zum Dashboard
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="text-sm">
              Du wurdest eingeladen, bei <strong>{invitation.siteName}</strong> mitzuarbeiten. Deine
              Rolle: <strong>{ROLE_LABELS[invitation.role]}</strong>.
            </p>
            <AcceptInvitation token={token} />
          </>
        )}
      </div>
    </main>
  );
}
