import type { Metadata } from 'next';

import { APP_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Sign In · ${APP_NAME}`,
  description: `Sign in to ${APP_NAME} — supplemental Japanese practice for the classroom. Teachers assign decks; students get more ways to study what they learn in class.`,
  alternates: {
    canonical: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
