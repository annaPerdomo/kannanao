import type { Metadata } from 'next';

import { TravelHub } from '@/components/Travel';

export const metadata: Metadata = {
  title: 'Travel Mode — Japanese Phrases & Guides for Your Trip | Kannanao',
  description:
    'Everything you need to navigate Japan with confidence. Food menus, survival phrases, katakana decoder, culture guide, and AI-powered conversation practice.',
  openGraph: {
    title: 'Travel Mode — Japanese Phrases & Guides for Your Trip',
    description:
      'Food menus, survival phrases, katakana decoder, culture tips, and more — zero Japanese required.',
    url: 'https://www.kannanao.com/travel',
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
  url: 'https://www.kannanao.com/travel',
  publisher: { '@type': 'Organization', name: 'Kannanao', url: 'https://www.kannanao.com' },
  hasPart: [
    {
      '@type': 'WebPage',
      name: 'Food Menu Cheat Sheet',
      url: 'https://www.kannanao.com/travel/food',
    },
    {
      '@type': 'WebPage',
      name: 'Survival Phrases',
      url: 'https://www.kannanao.com/travel/phrases',
    },
    {
      '@type': 'WebPage',
      name: 'Katakana Decoder',
      url: 'https://www.kannanao.com/travel/katakana',
    },
    {
      '@type': 'WebPage',
      name: 'What Did They Say?',
      url: 'https://www.kannanao.com/travel/heard',
    },
    {
      '@type': 'WebPage',
      name: 'Culture & Etiquette Guide',
      url: 'https://www.kannanao.com/travel/culture',
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
