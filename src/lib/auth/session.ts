import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getAuth } from './server';
import type { Session, User } from './server';

export interface AuthContext {
  session: Session;
  user: User;
}

/**
 * Reads the current session. Cached per request so that a layout and its pages
 * do not each hit the database.
 */
export const getSessionContext = cache(async (): Promise<AuthContext | null> => {
  const result = await getAuth().api.getSession({ headers: await headers() });
  return result ? { session: result.session, user: result.user } : null;
});

/** Guard for protected routes: redirects to the login page when signed out. */
export async function requireSession(returnTo?: string): Promise<AuthContext> {
  const context = await getSessionContext();
  if (!context) {
    const target = returnTo ? `/login?redirectTo=${encodeURIComponent(returnTo)}` : '/login';
    redirect(target);
  }
  return context;
}

/** Guard for the auth pages themselves: signed-in users belong in the dashboard. */
export async function redirectIfAuthenticated(to = '/dashboard'): Promise<void> {
  if (await getSessionContext()) {
    redirect(to);
  }
}
