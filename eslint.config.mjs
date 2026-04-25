import { FlatCompat } from '@eslint/eslintrc';
import configPrettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  // ── Ignore generated / build output ──────────────────────────────────────
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'coverage/**', 'next-env.d.ts'],
  },

  // ── Next.js recommended rules (core-web-vitals + TypeScript) ─────────────
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // ── Import sorting ────────────────────────────────────────────────────────
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
    },
  },

  // ── TypeScript hygiene ────────────────────────────────────────────────────
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // ── Prettier (must be last — disables conflicting format rules) ───────────
  configPrettier,
];

export default eslintConfig;
