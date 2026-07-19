import type { Metadata } from 'next';

import { TravelHub } from '@/components/Travel';
import { APP_NAME, APP_URL } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Travel Mode — Japanese Phrases & Guides for Your Trip | ${APP_NAME}`,
  description:
    'Everything you need to navigate Japan with confidence. Food menus, survival phrases, katakana decoder, culture guide, and AI-powered conversation practice.',
  openGraph: {
    title: 'Travel Mode — Japanese Phrases & Guides for Your Trip',
    description:
      'Food menus, survival phrases, katakana decoder, culture tips, and more — zero Japanese required.',
    url: `${APP_URL}/travel`,
  },
  alternates: {
    canonical: '/travel',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Travel Mode — Japanese Phrases & Guides',
  description:
    'Everything you need to navigate Japan with confidence. Food menus, survival phrases, katakana decoder, culture guide, and AI conversation practice.',
  url: `${APP_URL}/travel`,
  publisher: { '@type': 'Organization', name: APP_NAME, url: APP_URL },
  hasPart: [
    {
      '@type': 'WebPage',
      name: 'Food Menu Cheat Sheet',
      url: `${APP_URL}/travel/food`,
    },
    {
      '@type': 'WebPage',
      name: 'Survival Phrases',
      url: `${APP_URL}/travel/phrases`,
    },
    {
      '@type': 'WebPage',
      name: 'Katakana Decoder',
      url: `${APP_URL}/travel/katakana`,
    },
    {
      '@type': 'WebPage',
      name: 'What Did They Say?',
      url: `${APP_URL}/travel/heard`,
    },
    {
      '@type': 'WebPage',
      name: 'Culture & Etiquette Guide',
      url: `${APP_URL}/travel/culture`,
    },
  ],
};

export default function TravelPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TravelHub />
    </>
  );
}
