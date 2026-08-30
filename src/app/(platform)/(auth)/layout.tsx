import type { ReactNode } from 'react';
import { redirectIfAuthenticated } from '@/lib/auth/session';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  await redirectIfAuthenticated();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      {children}
    </main>
  );
}
