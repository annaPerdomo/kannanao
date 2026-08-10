import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MaterialsBuilder } from '@/components/MaterialsBuilder';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Materials.meta');
  return { title: t('title'), description: t('description') };
}

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  return <MaterialsBuilder initialGroupId={typeof group === 'string' ? group : undefined} />;
}
