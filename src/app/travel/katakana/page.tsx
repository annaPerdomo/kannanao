import type { Metadata } from 'next';

import { KatakanaDecoder } from '@/components/Travel';

export const metadata: Metadata = {
  title: 'Katakana Decoder — Read Japanese Signs & Menus | Kannanao',
  description:
    'Learn the 46 katakana characters used for foreign words on Japanese menus, signs, and labels. Interactive chart with pronunciation and common loan words to practice.',
  openGraph: {
    title: 'Katakana Decoder — Read Japanese Signs & Menus',
    description:
      'Learn the 46 katakana characters for foreign words on Japanese menus and signs. With pronunciation and loan word examples.',
    url: 'https://www.kannanao.com/travel/katakana',
  },
  alternates: {
    canonical: '/travel/katakana',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Katakana Decoder — Read Japanese Signs & Menus',
  description:
    'Learn the 46 katakana characters used for foreign words on Japanese menus, signs, and labels. Interactive chart with pronunciation.',
  author: { '@type': 'Organization', name: 'Kannanao' },
  publisher: { '@type': 'Organization', name: 'Kannanao', url: 'https://www.kannanao.com' },
  mainEntityOfPage: 'https://www.kannanao.com/travel/katakana',
  about: [
    { '@type': 'Thing', name: 'Katakana' },
    { '@type': 'Thing', name: 'Japanese writing system' },
  ],
};

export default function KatakanaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <KatakanaDecoder />
    </>
  );
}
