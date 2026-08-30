import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { getDb } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { getEnv, isGithubOAuthEnabled } from '@/lib/env';
import { sendMail } from '@/lib/mail/mailer';
import { passwordResetMail } from '@/lib/mail/templates';

const globalForAuth = globalThis as unknown as { __webpresslite_auth?: ReturnType<typeof create> };

function create() {
  const env = getEnv();

  return betterAuth({
    appName: 'webpresslite',
    baseURL: env.APP_URL,
    secret: env.AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: 'pg', schema }),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      sendResetPassword: async ({ user, url }) => {
        await sendMail(passwordResetMail(user.email, url));
      },
    },

    socialProviders: isGithubOAuthEnabled(env)
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID as string,
            clientSecret: env.GITHUB_CLIENT_SECRET as string,
          },
        }
      : {},

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },

    // Rate limiting is off outside production by default, but the auth
    // endpoints are the ones worth protecting everywhere. The limits are keyed
    // by IP, so they have to stay loose enough for users behind a shared NAT.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 60 * 60, max: 10 },
        '/request-password-reset': { window: 60 * 60, max: 3 },
        '/reset-password': { window: 60 * 60, max: 5 },
      },
    },

    // Must stay last: it writes Better Auth's cookies through Next's cookie API.
    plugins: [nextCookies()],
  });
}

export function getAuth() {
  globalForAuth.__webpresslite_auth ??= create();
  return globalForAuth.__webpresslite_auth;
}

export type Auth = ReturnType<typeof create>;
export type Session = Auth['$Infer']['Session']['session'];
export type User = Auth['$Infer']['Session']['user'];
