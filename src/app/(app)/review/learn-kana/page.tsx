import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { KanaJourneyScreen } from '@/components/KanaJourney';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Review.meta');
  return { title: t('learnKanaTitle'), description: t('learnKanaDescription') };
}

export default function LearnKanaPage() {
  return <KanaJourneyScreen />;
}
