import { describe, expect, it } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  fieldErrors,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/lib/auth/validation';

describe('registerSchema', () => {
  it('accepts a valid registration and trims whitespace', () => {
    const result = registerSchema.safeParse({
      name: '  Ada Lovelace  ',
      email: ' ada@example.com ',
      password: 'a'.repeat(MIN_PASSWORD_LENGTH),
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe('Ada Lovelace');
    expect(result.success && result.data.email).toBe('ada@example.com');
  });

  it('rejects a password below the minimum length', () => {
    const result = registerSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'a'.repeat(MIN_PASSWORD_LENGTH - 1),
    });

    expect(result.success).toBe(false);
    expect(result.success === false && fieldErrors(result.error).password).toContain(
      String(MIN_PASSWORD_LENGTH),
    );
  });

  it('rejects a malformed email', () => {
    const result = registerSchema.safeParse({
      name: 'Ada',
      email: 'not-an-email',
      password: 'a'.repeat(MIN_PASSWORD_LENGTH),
    });

    expect(result.success).toBe(false);
    expect(result.success === false && fieldErrors(result.error)).toHaveProperty('email');
  });
});

describe('loginSchema', () => {
  it('does not impose a minimum length on the password', () => {
    // Existing accounts may predate a stricter policy; the login form must not
    // lock them out before the credentials are even checked.
    expect(loginSchema.safeParse({ email: 'ada@example.com', password: 'x' }).success).toBe(true);
  });

  it('requires a password to be present', () => {
    expect(loginSchema.safeParse({ email: 'ada@example.com', password: '' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('rejects mismatched passwords on the confirmation field', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'a'.repeat(MIN_PASSWORD_LENGTH),
      confirmPassword: 'b'.repeat(MIN_PASSWORD_LENGTH),
    });

    expect(result.success).toBe(false);
    expect(result.success === false && fieldErrors(result.error).confirmPassword).toBe(
      'Die Passwörter stimmen nicht überein.',
    );
  });

  it('accepts two identical, long enough passwords', () => {
    const password = 'a'.repeat(MIN_PASSWORD_LENGTH);
    expect(resetPasswordSchema.safeParse({ password, confirmPassword: password }).success).toBe(
      true,
    );
  });
});

describe('fieldErrors', () => {
  it('keeps only the first message per field', () => {
    const result = registerSchema.safeParse({ name: '', email: '', password: '' });
    const errors = result.success === false ? fieldErrors(result.error) : {};

    for (const message of Object.values(errors)) {
      expect(typeof message).toBe('string');
    }
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'password']);
  });
});
