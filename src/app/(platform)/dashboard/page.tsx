import type { Metadata } from 'next';
import { requireSession } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Dashboard — webpresslite' };

export default async function DashboardPage() {
  const { user } = await requireSession('/dashboard');

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Angemeldet als <span data-testid="session-email">{user.email}</span>.
        </p>
      </header>

      <section className="rounded-lg border p-6">
        <h2 className="font-medium">Deine Sites</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Sites lassen sich ab Phase 2 anlegen.
        </p>
      </section>
    </div>
  );
}
