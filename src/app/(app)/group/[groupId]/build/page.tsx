import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LessonBuilder } from '@/components/Group/LessonBuilder';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Group.meta');
  return { title: t('buildTitle'), description: t('buildDescription') };
}

export default async function LessonBuilderPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <LessonBuilder groupId={groupId} />;
}
