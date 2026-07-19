import type { Metadata } from 'next';

import { CultureGuide } from '@/components/Travel';
import { APP_NAME, APP_URL } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Japan Culture & Etiquette Guide — Tips for Travelers | ${APP_NAME}`,
  description:
    'Essential Japanese etiquette and culture tips for travelers. Covers restaurants, trains, shopping, onsen, shrines, taboos, and gestures — avoid common mistakes.',
  openGraph: {
    title: 'Japan Culture & Etiquette Guide for Travelers',
    description:
      'Essential etiquette tips for restaurants, trains, onsen, shrines, and more — avoid common mistakes on your Japan trip.',
    url: `${APP_URL}/travel/culture`,
  },
  alternates: {
    canonical: '/travel/culture',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Japan Culture & Etiquette Guide for Travelers',
  description:
    'Essential Japanese etiquette and culture tips — restaurants, trains, shopping, onsen, shrines, taboos, and gestures.',
  author: { '@type': 'Organization', name: APP_NAME },
  publisher: { '@type': 'Organization', name: APP_NAME, url: APP_URL },
  mainEntityOfPage: `${APP_URL}/travel/culture`,
  about: [
    { '@type': 'Thing', name: 'Japanese culture' },
    { '@type': 'Thing', name: 'Travel etiquette' },
  ],
};

export default function CulturePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CultureGuide />
    </>
  );
}
