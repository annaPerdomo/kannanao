'use client';

import { useState } from 'react';
import { Box } from '@mui/material';
import { Home } from '@/pages/Home';
import { Deck } from '@/pages/Deck';
import { Study } from '@/pages/Study';
import { Practice } from '@/pages/Practice';
import type { Screen, PracticeMode } from '@/types/app';

export function ClientApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode | null>(null);

  const goHome = () => {
    setScreen('home');
    setActiveDeckId(null);
    setPracticeMode(null);
  };
  const openDeck = (id: string) => {
    setActiveDeckId(id);
    setScreen('deck');
  };
  const openStudy = () => setScreen('study');
  const openPractice = (mode: PracticeMode) => {
    setPracticeMode(mode);
    setScreen('practice');
  };
  const backToDeck = () => {
    setScreen('deck');
    setPracticeMode(null);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(249,168,212,0.18) 0%, transparent 28%),
          radial-gradient(circle at 80% 15%, rgba(196,181,253,0.14) 0%, transparent 26%),
          radial-gradient(circle at 50% 85%, rgba(255,219,235,0.7) 0%, transparent 32%)
        `,
      }}
    >
      {screen === 'home' && <Home onOpenDeck={openDeck} />}

      {screen === 'deck' && activeDeckId && (
        <Deck
          deckId={activeDeckId}
          onBack={goHome}
          onStudy={openStudy}
          onPractice={openPractice}
        />
      )}

      {screen === 'study' && activeDeckId && (
        <Study deckId={activeDeckId} onBack={backToDeck} />
      )}

      {screen === 'practice' && activeDeckId && practiceMode && (
        <Practice deckId={activeDeckId} mode={practiceMode} onBack={backToDeck} />
      )}
    </Box>
  );
}
