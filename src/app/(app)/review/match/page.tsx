import type { Metadata } from 'next';

import { WordMatch } from '@/components/Games';

export const metadata: Metadata = {
  title: 'Word Match — Review | Kannanao',
  description: 'Match Japanese words from your decks to their meanings — due cards first.',
};

export default function WordMatchPage() {
  return <WordMatch />;
}
