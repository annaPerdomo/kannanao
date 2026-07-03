import type { Metadata } from 'next';

import { PhraseBrowser } from '@/components/Travel';

export const metadata: Metadata = {
  title: 'Japanese Survival Phrases — Essential Travel Phrases by Situation | Kannanao',
  description:
    'Essential Japanese phrases for travelers organized by situation: greetings, restaurants, shopping, transport, hotels, directions, and emergencies — with romaji pronunciation.',
  openGraph: {
    title: 'Japanese Survival Phrases for Travelers',
    description:
      'Essential phrases by situation — greetings, restaurants, shopping, transport, hotels, and more. With romaji pronunciation.',
    url: 'https://www.kannanao.com/travel/phrases',
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
  author: { '@type': 'Organization', name: 'Kannanao' },
  publisher: { '@type': 'Organization', name: 'Kannanao', url: 'https://www.kannanao.com' },
  mainEntityOfPage: 'https://www.kannanao.com/travel/phrases',
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
