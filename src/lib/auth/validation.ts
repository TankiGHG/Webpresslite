import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 10;

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Bitte gib eine E-Mail-Adresse ein.')
  .email('Das sieht nicht nach einer gültigen E-Mail-Adresse aus.');

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`)
  .max(128, 'Das Passwort darf höchstens 128 Zeichen lang sein.');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib einen Namen mit mindestens 2 Zeichen ein.'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Bitte gib dein Passwort ein.'),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Die Passwörter stimmen nicht überein.',
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib einen Namen mit mindestens 2 Zeichen ein.'),
});

/** Turns a Zod error into a flat `{ field: message }` map for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in result)) {
      result[key] = issue.message;
    }
  }
  return result;
}
