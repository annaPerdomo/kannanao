import Box from '@mui/material/Box';

import type { Locale } from '@/i18n/config';
import { landingSeoFor } from '@/i18n/messages';
import { APP_NAME, APP_URL } from '@/lib/brand';
import { amber, darkPurple, emerald, ocean, pink, purple, sky } from '@/theme';

import LandingAuthGuard from './LandingAuthGuard';
import LandingGlobalStyles from './LandingGlobalStyles';
import { LanguageToggle } from './LanguageToggle';
import {
  AiDemoSection,
  AudienceSection,
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

// Shared by /landing and /landing/ja, which pass their own build-time constant.
// This stays a Server Component, so its copy comes from the message JSON
// directly instead of useTranslations: next-intl's server API reads the locale
// cookie, which would opt both pages out of static prerendering. The sections
// below are client components and use the hook normally, under the provider the
// page mounts.
function buildJsonLd(locale: Locale) {
  const seo = landingSeoFor(locale);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: APP_NAME,
      applicationCategory: 'EducationApplication',
      operatingSystem: 'Web',
      description: seo.appDescription,
      url: APP_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      // Signal to search engines that this serves both the educator who
      // assigns practice and the learner who does it — the core of the
      // supplemental-practice positioning.
      audience: [
        { '@type': 'EducationalAudience', educationalRole: 'teacher' },
        { '@type': 'EducationalAudience', educationalRole: 'student' },
      ],
      inLanguage: ['en', 'ja'],
      featureList: seo.featureList,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Variations on a String',
      url: 'https://www.variationsonastring.com',
      logo: `${APP_URL}/icons/icon-512.png`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: seo.faq.map((entry) => ({
        '@type': 'Question',
        name: entry.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: entry.answer,
        },
      })),
    },
  ];
}

export default function LandingPage({ locale }: { locale: Locale }) {
  const jsonLd = buildJsonLd(locale);

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
      <LandingAuthGuard />
      <LanguageToggle current={locale} />
      {/*
        Narrative order: hero → who it's for (Audience) → the educator live
        demo (AI generation) → the learner live demo (spaced repetition +
        games) → motivation → groups → travel → full feature grid → setup →
        CTA. The two Audience cards deep-link to #for-educators / #for-learners.
      */}
      <HeroSection />
      <AudienceSection />
      <SectionDivider fromColor={purple[50]} toColor={pink[50]} />
      <AiDemoSection />
      <SectionDivider fromColor={pink[50]} toColor={pink[50]} />
      <PracticeSection />
      <SectionDivider fromColor={pink[50]} toColor={amber[50]} />
      <GamificationSection />
      <SectionDivider fromColor={pink[50]} toColor={ocean[50]} />
      <GroupSection />
      <SectionDivider fromColor={purple[50]} toColor={emerald[50]} />
      <TravelModeSection />
      <SectionDivider fromColor={sky[50]} toColor={darkPurple.base} />
      <FeaturesSection />
      <SectionDivider fromColor={darkPurple.deepest} toColor={sky[50]} />
      <HowItWorksSection />
      <CtaSection />
    </Box>
  );
}
