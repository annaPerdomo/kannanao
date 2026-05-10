import Box from '@mui/material/Box';

import { amber, darkPurple, emerald, ocean, pink, purple, sky } from '@/theme';

import LandingGlobalStyles from './LandingGlobalStyles';
import {
  AiDemoSection,
  CtaSection,
  FeaturesSection,
  GamificationSection,
  GroupSection,
  HeroSection,
  HowItWorksSection,
  PracticeSection,
  SectionDivider,
  TravelModeSection,
} from './sections';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kannanao',
    applicationCategory: 'EducationApplication',
    operatingSystem: 'Web',
    description:
      'AI-powered Japanese flashcard studio with travel phrasebooks, speech practice, group classrooms, gamified XP & achievements, multiple themes, and multiple practice modes.',
    url: 'https://www.kannanao.com',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    inLanguage: ['en', 'ja'],
    featureList: [
      'AI flashcard generation with Google Gemini',
      'Travel Mode with 9 phrasebook modules',
      'Match, Fill-in-the-blank, and Recall practice modes',
      'Speech memorization practice',
      'Group classrooms with assignments and leaderboards',
      'XP system with achievements and daily streaks',
      '10 customizable color themes',
      'PDF vocabulary import',
      'Deck sharing and embeddable widgets',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Variations on a String',
    url: 'https://www.variationsonastring.com',
    logo: 'https://www.kannanao.com/icons/icon-512.png',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Kannanao?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Kannanao is a free, AI-powered Japanese flashcard studio. It uses Google Gemini to generate readings, meanings, and bilingual example sentences for any word you type. It also includes Travel Mode phrasebooks, group study classrooms, gamified XP, and 10 customizable themes.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does AI flashcard generation work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Type any word in English or Japanese and Kannanao uses Google Gemini AI to generate the hiragana reading, kanji, meaning, and bilingual example sentences. You can also upload a PDF to extract vocabulary and generate cards in bulk.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is Travel Mode?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Travel Mode is a built-in pocket phrasebook with 9 interactive modules: Daily Phrases, Scenarios, Food Menu, Emergency, Listening Practice, Katakana Decoder, Culture Guide, Point & Communicate, and Show Cards. Each module prepares you for real conversations in Japan.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I study with friends or in a class?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Kannanao supports group study. Organizers can create a group, invite members via QR code, assign decks with deadlines, view a weekly XP leaderboard, and send encouragement messages. You can also share any deck with a link or embed flashcards on a website.',
        },
      },
      {
        '@type': 'Question',
        name: 'What practice modes are available?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Kannanao offers three practice modes: Match (race the clock pairing words to meanings), Fill-in-the-blank (type the missing word in a sentence), and Recall (see the meaning, type the Japanese). Every session earns XP toward your next level.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is Kannanao free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Kannanao is currently free and in closed beta. You can join the waitlist on the homepage to be notified when new spots open up.',
        },
      },
    ],
  },
];

export default function LandingPage() {
  return (
    <Box>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <LandingGlobalStyles />
      <HeroSection />
      <FeaturesSection />
      <SectionDivider fromColor={darkPurple.deepest} toColor={pink[50]} />
      <AiDemoSection />
      <SectionDivider fromColor={pink[50]} toColor={emerald[50]} />
      <TravelModeSection />
      <SectionDivider fromColor={sky[50]} toColor={pink[50]} />
      <PracticeSection />
      <SectionDivider fromColor={pink[50]} toColor={amber[50]} />
      <GamificationSection />
      <SectionDivider fromColor={pink[50]} toColor={ocean[50]} />
      <GroupSection />
      <SectionDivider fromColor={purple[50]} toColor={sky[50]} />
      <HowItWorksSection />
      <CtaSection />
    </Box>
  );
}
