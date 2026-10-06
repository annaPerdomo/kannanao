import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { type BuilderTab, MaterialsBuilder } from '@/components/MaterialsBuilder';

const TABS: BuilderTab[] = ['assigned', 'lessonSet', 'kana', 'deck', 'quizlet'];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Materials.meta');
  return { title: t('title'), description: t('description') };
}

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; tab?: string }>;
}) {
  const { group, tab } = await searchParams;
  return (
    <MaterialsBuilder
      initialGroupId={typeof group === 'string' ? group : undefined}
      initialTab={TABS.find((t) => t === tab)}
    />
  );
}
