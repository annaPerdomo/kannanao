import type { Metadata } from 'next';

import { GamesHub } from '@/components/Games';

export const metadata: Metadata = {
  title: 'Practice Games — Japanese Review | Kannanao',
  description:
    'Quick games to keep your Japanese fresh: word matching and kana building from your own decks, plus question-word and particle practice.',
};

export default function GamesPage() {
  return <GamesHub />;
}
