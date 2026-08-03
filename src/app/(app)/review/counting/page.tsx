import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CounterGame } from '@/components/Games';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Review.meta');
  return { title: t('countingTitle'), description: t('countingDescription') };
}

export default function CounterGamePage() {
  return <CounterGame />;
}
