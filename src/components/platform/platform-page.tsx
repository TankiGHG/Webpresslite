import type { ReactNode } from 'react';
import { requireSession } from '@/lib/auth/session';
import { TopBar } from './top-bar';

/** Layout for pages outside a site: top bar plus a centred content column. */
export async function PlatformPage({
  returnTo,
  children,
  width = 'default',
}: {
  returnTo: string;
  children: ReactNode;
  width?: 'default' | 'narrow';
}) {
  const { user } = await requireSession(returnTo);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        user={{ name: user.name, email: user.email, isPlatformAdmin: user.isPlatformAdmin }}
      />
      <main
        className={
          width === 'narrow'
            ? 'mx-auto w-full max-w-3xl px-6 py-8 lg:py-10'
            : 'app-container py-8 lg:py-10'
        }
      >
        {children}
      </main>
    </div>
  );
}
