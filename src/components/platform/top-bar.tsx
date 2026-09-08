'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/utils';
import { UserMenu, type UserMenuProps } from './user-menu';

/** Header for pages outside a site: dashboard, profile, administration. */
export function TopBar({ user }: { user: UserMenuProps }) {
  const pathname = usePathname();
  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    ...(user.isPlatformAdmin ? [{ href: '/admin/users', label: 'Nutzerverwaltung' }] : []),
  ];

  return (
    <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
      <div className="app-container flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Hauptnavigation">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <UserMenu {...user} />
      </div>
    </header>
  );
}
