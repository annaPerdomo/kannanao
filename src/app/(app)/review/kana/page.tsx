import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { KanaBuilder } from '@/components/Games';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Review.meta');
  return { title: t('kanaTitle'), description: t('kanaDescription') };
}

export default function KanaBuilderPage() {
  return <KanaBuilder />;
}
