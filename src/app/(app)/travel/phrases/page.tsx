import type { Metadata } from 'next';

import { PhraseBrowser } from '@/components/Travel';
import { APP_NAME, APP_URL } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Japanese Survival Phrases — Essential Travel Phrases by Situation | ${APP_NAME}`,
  description:
    'Essential Japanese phrases for travelers organized by situation: greetings, restaurants, shopping, transport, hotels, directions, and emergencies — with romaji pronunciation.',
  openGraph: {
    title: 'Japanese Survival Phrases for Travelers',
    description:
      'Essential phrases by situation — greetings, restaurants, shopping, transport, hotels, and more. With romaji pronunciation.',
    url: `${APP_URL}/travel/phrases`,
  },
  alternates: {
    canonical: '/travel/phrases',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Japanese Survival Phrases for Travelers',
  description:
    'Essential Japanese phrases organized by situation — greetings, restaurants, shopping, transport, hotels, directions, and emergencies.',
  author: { '@type': 'Organization', name: APP_NAME },
  publisher: { '@type': 'Organization', name: APP_NAME, url: APP_URL },
  mainEntityOfPage: `${APP_URL}/travel/phrases`,
  about: [
    { '@type': 'Thing', name: 'Japanese language' },
    { '@type': 'Thing', name: 'Travel phrases' },
  ],
};

export default function PhrasesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PhraseBrowser />
    </>
  );
}
