import { z } from 'zod';

/**
 * Central, validated access to configuration. Nothing outside this module
 * reads `process.env` directly, so a missing variable fails loudly at startup
 * instead of surfacing as `undefined` somewhere deep in a request.
 */
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const serverSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    DATABASE_URL: z.string().url(),

    // Root domain the platform runs on. Tenants live on `<subdomain>.<ROOT_DOMAIN>`.
    ROOT_DOMAIN: z.string().min(1),
    APP_URL: z.string().url(),

    // S3 compatible storage (MinIO locally and in production).
    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_FORCE_PATH_STYLE: z
      .string()
      .optional()
      .transform((value) => value !== 'false'),

    AUTH_SECRET: z.string().min(32),

    // GitHub OAuth is optional; the provider is only registered when both are set.
    GITHUB_CLIENT_ID: optionalString,
    GITHUB_CLIENT_SECRET: optionalString,

    // SMTP (Mailcow). Without a host, mails are written to the log instead of sent.
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    SMTP_SECURE: z
      .string()
      .optional()
      .transform((value) => value === 'true'),
    SMTP_FROM: z.string().min(1).default('webpresslite <noreply@example.com>'),
  })
  .refine(
    (env) => Boolean(env.GITHUB_CLIENT_ID) === Boolean(env.GITHUB_CLIENT_SECRET),
    'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set together.',
  );

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'config'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

export function isGithubOAuthEnabled(env: ServerEnv = getEnv()): boolean {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}
