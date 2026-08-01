'use client';

import { useEffect, useState } from 'react';

import { DEMO_CARDS, type DemoStage, TIMELINE, TYPE_TICK_MS, TYPING_FRAMES } from './constants';

export interface DemoState {
  stage: DemoStage;
  /** Index into TYPING_FRAMES, clamped to the last frame. */
  frame: number;
  cardsIn: number;
  phoneIn: boolean;
  answered: boolean;
}

const FINAL: DemoState = {
  stage: 'practice',
  frame: TYPING_FRAMES.length - 1,
  cardsIn: DEMO_CARDS.length,
  phoneIn: true,
  answered: true,
};

/**
 * Drives the hero's looping story: words typed into Add Cards → generating →
 * cards landing in the deck → the learner's phone switching from the study card
 * to a Sentence Builder round. Reduced motion gets the end state, still.
 */
export function useDemoStage(): DemoState {
  const [state, setState] = useState<DemoState>({
    stage: 'typing',
    frame: 0,
    cardsIn: 0,
    phoneIn: false,
    answered: false,
  });
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState(FINAL);
      return;
    }

    setState({ stage: 'typing', frame: 0, cardsIn: 0, phoneIn: false, answered: false });

    let frame = 0;
    const ticker = setInterval(() => {
      frame += 1;
      if (frame >= TYPING_FRAMES.length) {
        clearInterval(ticker);
        return;
      }
      setState((s) => ({ ...s, frame }));
    }, TYPE_TICK_MS);

    const at = (ms: number, next: (s: DemoState) => DemoState) =>
      setTimeout(() => setState(next), ms);

    const timers = [
      at(TIMELINE.generating, (s) => ({ ...s, stage: 'generating' })),
      at(TIMELINE.cards, (s) => ({ ...s, stage: 'cards' })),
      ...DEMO_CARDS.map((_, i) =>
        at(TIMELINE.cards + i * TIMELINE.cardStagger, (s) => ({ ...s, cardsIn: i + 1 })),
      ),
      at(TIMELINE.phoneIn, (s) => ({ ...s, phoneIn: true })),
      at(TIMELINE.practice, (s) => ({ ...s, stage: 'practice' })),
      at(TIMELINE.answer, (s) => ({ ...s, answered: true })),
      setTimeout(() => setCycle((c) => c + 1), TIMELINE.loop),
    ];

    return () => {
      clearInterval(ticker);
      timers.forEach(clearTimeout);
    };
  }, [cycle]);

  return state;
}
