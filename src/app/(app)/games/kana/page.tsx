import type { Metadata } from 'next';

import { KanaBuilder } from '@/components/Games';

export const metadata: Metadata = {
  title: 'Kana Builder — Practice Games | Kannanao',
  description: 'Build the kana spelling of words from your decks, one character tile at a time.',
};

export default function KanaBuilderPage() {
  return <KanaBuilder />;
}
