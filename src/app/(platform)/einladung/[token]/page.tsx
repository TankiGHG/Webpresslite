import { MailOpen, MailX, UserRoundX } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { AcceptInvitation } from '@/components/members/accept-invitation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { previewInvitation } from '@/lib/db/queries/members';
import { ROLE_LABELS } from '@/lib/sites/roles';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Einladung' };

function InvitationCard({
  icon,
  tone = 'primary',
  title,
  children,
}: {
  icon: ReactNode;
  tone?: 'primary' | 'danger';
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-5 py-8 text-center">
        <span
          className={cn(
            'mx-auto flex size-12 items-center justify-center rounded-full [&_svg]:size-5',
            tone === 'danger'
              ? 'bg-danger-soft text-danger'
              : 'bg-primary-soft text-primary-soft-foreground',
          )}
          aria-hidden
        >
          {icon}
        </span>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {children}
      </CardContent>
    </Card>
  );
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Signing in first means the invitation is always accepted by a known
  // account, and the address can be checked against the one it was sent to.
  const { user } = await requireSession(`/einladung/${token}`);
  const invitation = await previewInvitation(token);

  let card: ReactNode;

  if (!invitation) {
    card = (
      <InvitationCard icon={<MailX />} tone="danger" title="Einladung ungültig">
        <p className="text-muted-foreground text-sm">
          Dieser Link ist abgelaufen, wurde zurückgezogen oder schon eingelöst. Bitte lass dir eine
          neue Einladung schicken.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Zum Dashboard</Link>
        </Button>
      </InvitationCard>
    );
  } else if (invitation.email !== user.email.toLowerCase()) {
    card = (
      <InvitationCard icon={<UserRoundX />} tone="danger" title="Falsches Konto">
        <p className="text-muted-foreground text-sm">
          Diese Einladung wurde an <strong className="text-foreground">{invitation.email}</strong>{' '}
          geschickt, du bist aber als <strong className="text-foreground">{user.email}</strong>{' '}
          angemeldet. Melde dich mit der eingeladenen Adresse an.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Zum Dashboard</Link>
        </Button>
      </InvitationCard>
    );
  } else {
    card = (
      <InvitationCard icon={<MailOpen />} title={`Willkommen bei ${invitation.siteName}`}>
        <p className="text-muted-foreground text-sm">
          Du wurdest eingeladen, bei{' '}
          <strong className="text-foreground">{invitation.siteName}</strong> mitzuarbeiten — als{' '}
          <strong className="text-foreground">{ROLE_LABELS[invitation.role]}</strong>.
        </p>
        <div className="flex justify-center">
          <AcceptInvitation token={token} />
        </div>
      </InvitationCard>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <Logo />
      {card}
    </main>
  );
}
