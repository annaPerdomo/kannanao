import '@testing-library/jest-dom';

import type * as NextIntl from 'next-intl';
import { vi } from 'vitest';

// ─── Supabase env vars (must come before any module that calls createClient) ──
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-for-testing';

// ─── next/navigation mock ────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// ─── next-intl shim ──────────────────────────────────────────────────────────
// Existing tests render components in isolation and assert on English copy, with
// no <NextIntlClientProvider> in the tree. Rather than wrap every test, back the
// hooks with next-intl's own non-React translator over the REAL src/messages/en.json
// — so ICU syntax, rich text and missing-key errors behave exactly as in the app,
// but no provider is needed. Tests that specifically exercise Japanese copy should
// render a real provider (which this passthrough deliberately does not fight).
vi.mock('next-intl', async () => {
  const actual = await vi.importActual<typeof NextIntl>('next-intl');
  const { default: messages } = await import('@/messages/en.json');
  const locale = 'en';

  // Memoize per namespace: useTranslations must return a stable `t` across
  // renders, or components that put it in a hook dep array would loop forever.
  const translators = new Map<string, unknown>();
  const formatter = actual.createFormatter({ locale });

  return {
    ...actual,
    useLocale: () => locale,
    useMessages: () => messages,
    useTranslations: (namespace?: string) => {
      const key = namespace ?? '';
      if (!translators.has(key)) {
        translators.set(key, actual.createTranslator({ locale, messages, namespace } as never));
      }
      return translators.get(key);
    },
    useFormatter: () => formatter,
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ─── next/image mock ─────────────────────────────────────────────────────────
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    return React.createElement('img', { src, alt, ...props });
  },
}));

// ─── window.matchMedia mock ──────────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─── ResizeObserver mock ─────────────────────────────────────────────────────
// A real class, not `vi.fn().mockImplementation(...)`: MUI's TextareaAutosize
// calls `new ResizeObserver(...)`, and the mock form threw "is not a
// constructor" for any test that mounted a multiline TextField.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ─── localStorage mock ───────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
