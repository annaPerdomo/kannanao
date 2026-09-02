import { fireEvent, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getKanaEntry } from '@/lib/kanaCurriculum';
import {
  isKanaKnown,
  type KanaProgressMap,
  kanaStrengthState,
  pickKanaCheck,
} from '@/lib/kanaProficiency';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/hooks/useSpeech', () => ({
  useSpeech: () => ({ speak: vi.fn(), speakAll: vi.fn(), stop: vi.fn(), speaking: false }),
  speechNeedsGesture: () => false,
  useJapaneseVoice: () => 'ready',
}));

const mockAnswer = vi.fn().mockResolvedValue(undefined);
const mockFinish = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useGameSession', () => ({
  useGameSession: () => ({ answer: mockAnswer, finish: mockFinish, comboCount: 0 }),
}));

import { KanaCheck } from '../KanaCheck';

const QUESTIONS = pickKanaCheck();

function renderCheck(byKana: KanaProgressMap = new Map()) {
  const record = vi.fn().mockResolvedValue(undefined);
  const onExit = vi.fn();
  const onReview = vi.fn();
  renderWithProviders(
    <KanaCheck byKana={byKana} record={record} onExit={onExit} onReview={onReview} />,
  );
  return { record, onExit, onReview };
}

// pickKanaCheck is deterministic, so the nth question is known up front.
function answerCurrent(index: number, correctly: boolean) {
  const right = new RegExp(`: ${getKanaEntry(QUESTIONS[index])!.romaji}$`);
  const options = screen.getAllByRole('button', { name: /^Answer [A-D]:/ });
  const target = correctly
    ? options.find((b) => right.test(b.getAttribute('aria-label')!))!
    : options.find((b) => !right.test(b.getAttribute('aria-label')!))!;
  fireEvent.click(target);
  act(() => void vi.advanceTimersByTime(700));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('KanaCheck', () => {
  it('should ask for a sound, with no mnemonic and no way to linger', () => {
    renderCheck();
    expect(screen.getByText('Which sound is this?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show a hint' })).not.toBeInTheDocument();
    expect(screen.getByText(`1 / ${QUESTIONS.length}`)).toBeInTheDocument();
  });

  it('should ask only characters that have a sound to name', () => {
    renderCheck();
    expect(screen.getByText(QUESTIONS[0])).toBeInTheDocument();
    expect(QUESTIONS.every((kana) => getKanaEntry(kana)!.labelKey === undefined)).toBe(true);
  });

  it('should write a hit through the normal graded path, character first', () => {
    vi.useFakeTimers();
    try {
      const { record } = renderCheck();
      const asked = QUESTIONS[0];
      answerCurrent(0, true);
      expect(record).toHaveBeenCalledWith(asked, true);
      expect(record.mock.calls[0]).toEqual([asked, true]);
      expect(record.mock.calls.every(([, correct]) => correct === true)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should let a miss cost only the character she missed', () => {
    vi.useFakeTimers();
    try {
      const { record } = renderCheck();
      const asked = QUESTIONS[0];
      answerCurrent(0, false);
      expect(record.mock.calls).toEqual([[asked, false]]);
      expect(kanaStrengthState({ correctCount: 0, wrongCount: 1 })).toBe('learning');
    } finally {
      vi.useRealTimers();
    }
  });

  it('should never leave a character it seeded looking mastered', () => {
    vi.useFakeTimers();
    try {
      const { record } = renderCheck();
      answerCurrent(0, true);
      expect(record.mock.calls.length).toBeGreaterThan(1);
      expect(record.mock.calls.every(([, correct]) => correct)).toBe(true);
      expect(isKanaKnown({ correctCount: 1, wrongCount: 0 })).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should end on a result screen that hands her to Review', async () => {
    vi.useFakeTimers();
    try {
      renderCheck();
      for (let i = 0; i < QUESTIONS.length; i += 1) answerCurrent(i, true);
      await act(async () => await vi.runOnlyPendingTimersAsync());
      expect(mockFinish).toHaveBeenCalled();
      expect(screen.getByText(/characters look solid/)).toHaveTextContent(
        `${QUESTIONS.length} characters look solid`,
      );
      expect(screen.getByRole('button', { name: 'Start reviewing' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should save the run before leaving when the learner quits early', async () => {
    const { onExit } = renderCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Quit & Save Progress' }));
    await waitFor(() => expect(mockFinish).toHaveBeenCalled());
    expect(onExit).toHaveBeenCalled();
  });
});
