import type { Metadata } from 'next';

import { WhatDidTheySay } from '@/components/Travel';
import { APP_NAME, APP_URL } from '@/lib/brand';

export const metadata: Metadata = {
  title: `"What Did They Say?" — Phrases You'll Hear in Japan | ${APP_NAME}`,
  description:
    'Understand what Japanese people say TO you at convenience stores, restaurants, train stations, shops, and hotels. With pronunciation and how to respond.',
  openGraph: {
    title: '"What Did They Say?" — Phrases You\'ll Hear in Japan',
    description:
      'Common Japanese phrases said to tourists at stores, restaurants, stations, and hotels — with translations and suggested responses.',
    url: `${APP_URL}/travel/heard`,
  },
  alternates: {
    canonical: '/travel/heard',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What do they say at Japanese convenience stores?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Common phrases include "Irasshaimase" (Welcome), "Pointo kaado wa omochi desu ka?" (Do you have a point card?), "Fukuro irimasu ka?" (Do you need a bag?), and "Atatamemasu ka?" (Shall I heat this up?).',
      },
    },
    {
      '@type': 'Question',
      name: 'What do they say at Japanese restaurants?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You\'ll hear "Irasshaimase" (Welcome), "Nan-mei-sama desu ka?" (How many people?), "Kochira e douzo" (This way please), and "Go-chuumon wa?" (What would you like to order?).',
      },
    },
  ],
};

export default function HeardPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WhatDidTheySay />
    </>
  );
}
