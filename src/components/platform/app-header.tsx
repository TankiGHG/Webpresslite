import Link from 'next/link';
import { SignOutButton } from '@/components/auth/sign-out-button';

export function AppHeader({ userName }: { userName: string }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="font-semibold">
            webpresslite
          </Link>
          <Link href="/dashboard" className="text-[var(--color-muted-foreground)] hover:underline">
            Dashboard
          </Link>
          <Link href="/profile" className="text-[var(--color-muted-foreground)] hover:underline">
            Profil
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-muted-foreground)]">{userName}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
