import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ParticlePicker } from '@/components/Games';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Review.meta');
  return { title: t('particlesTitle'), description: t('particlesDescription') };
}

export default function ParticlePickerPage() {
  return <ParticlePicker />;
}
