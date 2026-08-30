import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/db/client', '@/lib/db/schema'],
              message:
                'Do not access Drizzle directly. Go through lib/db/queries/* so tenant scoping and permission checks are enforced.',
            },
          ],
        },
      ],
    },
  },
  {
    // The data-access layer and the infrastructure health probe may touch Drizzle directly.
    files: ['src/lib/db/**/*.ts', 'src/lib/health.ts', 'scripts/**/*.ts', 'drizzle.config.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
];

export default config;
