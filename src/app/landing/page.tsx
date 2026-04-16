import Box from '@mui/material/Box';
import LandingGlobalStyles from './LandingGlobalStyles';
import {
  HeroSection,
  FeaturesSection,
  AiDemoSection,
  HowItWorksSection,
  PracticeSection,
  CtaSection,
} from './sections';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Kannanao',
  applicationCategory: 'EducationApplication',
  operatingSystem: 'Web',
  description:
    'Create Japanese flashcards with AI, practice with Match, Fill-in-the-blank & Recall modes, track XP & streaks, import PDFs, and share decks.',
  url: 'https://kannanao.vercel.app',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  inLanguage: ['en', 'ja'],
};

export default function LandingPage() {
  return (
    <Box>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingGlobalStyles />
      <HeroSection />
      <FeaturesSection />
      <AiDemoSection />
      <HowItWorksSection />
      <PracticeSection />
      <CtaSection />
    </Box>
  );
}
