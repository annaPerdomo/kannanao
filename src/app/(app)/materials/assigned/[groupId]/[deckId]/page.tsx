import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { HandoutPage } from '@/components/HandoutPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Materials.handoutPage');
  return { title: t('metaTitle') };
}

export default async function AssignedHandoutPage({
  params,
}: {
  params: Promise<{ groupId: string; deckId: string }>;
}) {
  const { groupId, deckId } = await params;
  return <HandoutPage groupId={groupId} deckId={deckId} />;
}
