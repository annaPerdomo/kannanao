import type { Metadata } from 'next';

import { FoodMenu } from '@/components/Travel';

export const metadata: Metadata = {
  title: 'Japanese Food Menu Cheat Sheet — Ramen, Sushi, Izakaya & Konbini | Kannanao',
  description:
    'Learn Japanese food vocabulary before your trip. Ramen types, sushi names, common dishes, drinks, konbini snacks, and ordering phrases — all with pronunciation.',
  openGraph: {
    title: 'Japanese Food Menu Cheat Sheet',
    description:
      'Ramen types, sushi names, common dishes, drinks, konbini snacks, and ordering phrases — with pronunciation guides.',
    url: 'https://www.kannanao.com/travel/food',
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
  author: { '@type': 'Organization', name: 'Kannanao' },
  publisher: { '@type': 'Organization', name: 'Kannanao', url: 'https://www.kannanao.com' },
  mainEntityOfPage: 'https://www.kannanao.com/travel/food',
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
