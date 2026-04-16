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

export default function LandingPage() {
  return (
    <Box>
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
