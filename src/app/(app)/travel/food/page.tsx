import type { Metadata } from 'next';

import { FoodMenu } from '@/components/Travel';
import { APP_NAME, APP_URL } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Japanese Food Menu Cheat Sheet — Ramen, Sushi, Izakaya & Konbini | ${APP_NAME}`,
  description:
    'Learn Japanese food vocabulary before your trip. Ramen types, sushi names, common dishes, drinks, konbini snacks, and ordering phrases — all with pronunciation.',
  openGraph: {
    title: 'Japanese Food Menu Cheat Sheet',
    description:
      'Ramen types, sushi names, common dishes, drinks, konbini snacks, and ordering phrases — with pronunciation guides.',
    url: `${APP_URL}/travel/food`,
  },
  alternates: {
    canonical: '/travel/food',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Japanese Food Menu Cheat Sheet',
  description:
    'Learn Japanese food vocabulary — ramen types, sushi names, common dishes, drinks, konbini snacks, and ordering phrases with pronunciation.',
  author: { '@type': 'Organization', name: APP_NAME },
  publisher: { '@type': 'Organization', name: APP_NAME, url: APP_URL },
  mainEntityOfPage: `${APP_URL}/travel/food`,
  about: [
    { '@type': 'Thing', name: 'Japanese cuisine' },
    { '@type': 'Thing', name: 'Japanese language' },
  ],
};

export default function FoodPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FoodMenu />
    </>
  );
}
