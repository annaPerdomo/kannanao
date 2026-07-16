import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { QuestionQuest } from '@/components/Games';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Review.meta');
  return { title: t('questionsTitle'), description: t('questionsDescription') };
}

export default function QuestionQuestPage() {
  return <QuestionQuest />;
}
