import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In · Kannanao',
  description:
    'Sign in to Kannanao — your AI-powered Japanese flashcard studio. Practice vocabulary, track your progress, and learn Japanese.',
  alternates: {
    canonical: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
