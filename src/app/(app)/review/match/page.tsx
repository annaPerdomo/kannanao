import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { WordMatch } from '@/components/Games';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Review.meta');
  return { title: t('matchTitle'), description: t('matchDescription') };
}

export default function WordMatchPage() {
  return <WordMatch />;
}
