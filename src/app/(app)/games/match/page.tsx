import type { Metadata } from 'next';

import { WordMatch } from '@/components/Games';

export const metadata: Metadata = {
  title: 'Word Match — Practice Games | Kannanao',
  description: 'Match Japanese words from your decks to their English meanings.',
};

export default function WordMatchPage() {
  return <WordMatch />;
}
