import type { Metadata } from 'next';

import { APP_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Sign In · ${APP_NAME}`,
  description: `Sign in to ${APP_NAME} — your AI-powered Japanese flashcard studio. Practice vocabulary, track your progress, and learn Japanese.`,
  alternates: {
    canonical: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
