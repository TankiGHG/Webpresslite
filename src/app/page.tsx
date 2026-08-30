import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getSessionContext } from '@/lib/auth/session';

export default async function HomePage() {
  const context = await getSessionContext();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">webpresslite</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Schreib und veröffentliche unter deiner eigenen Subdomain.
        </p>
      </div>

      <div className="flex gap-3">
        {context ? (
          <Button asChild>
            <Link href="/dashboard">Zum Dashboard</Link>
          </Button>
        ) : (
          <>
            <Button asChild>
              <Link href="/register">Konto anlegen</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Anmelden</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
