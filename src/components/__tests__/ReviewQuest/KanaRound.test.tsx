import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak: vi.fn() }) }));

import { romajiOf } from '@/components/KanaJourney';
import { KanaRound } from '@/components/ReviewQuest/KanaRound';
import { renderWithProviders } from '@/test/renderWithProviders';

const CHARS = ['ぬ', 'ね', 'ま'];

/** Recognize shows the glyph; recall shows its romaji and offers kana tiles. */
function shownKana(): string {
  const glyph = screen.queryByRole('button', { name: 'Tap to hear it' });
  if (glyph) return glyph.textContent!;
  return CHARS.find((k) => screen.queryAllByText(romajiOf(k)).length > 0)!;
}

function answer(correct: boolean) {
  const kana = shownKana();
  const tiles = screen.queryAllByRole('button', { name: /^Answer [A-D]: / });
  if (tiles.length > 0) {
    const wanted = `: ${romajiOf(kana)}`;
    const tile = correct
      ? tiles.find((t) => t.getAttribute('aria-label')!.endsWith(wanted))!
      : tiles.find((t) => !t.getAttribute('aria-label')!.endsWith(wanted))!;
    fireEvent.click(tile);
    return kana;
  }
  const kanaTiles = screen.getAllByRole('button', { name: /^[ぁ-んァ-ヶ]$/ });
  const tile = correct
    ? kanaTiles.find((t) => t.getAttribute('aria-label') === kana)!
    : kanaTiles.find((t) => t.getAttribute('aria-label') !== kana)!;
  fireEvent.click(tile);
  return kana;
}

function renderRound(props: Partial<React.ComponentProps<typeof KanaRound>> = {}) {
  const onAnswer = vi.fn();
  renderWithProviders(
    <KanaRound
      chars={CHARS}
      comboCount={0}
      onAnswer={onAnswer}
      onComplete={vi.fn()}
      onQuit={vi.fn()}
      questMap={null}
      {...props}
    />,
  );
  return onAnswer;
}

describe('KanaRound', () => {
  it('meets only the characters the learner has never seen', () => {
    renderRound({ newChars: ['ね'] });
    expect(screen.getByText('Meet this character')).toBeInTheDocument();
    expect(shownKana()).toBe('ね');

    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Meet this character')).toBeNull();
  });

  it('asks a missed character again before the stage ends', () => {
    vi.useFakeTimers();
    try {
      const onAnswer = renderRound();
      const missed = answer(false);
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      for (let i = 0; i < CHARS.length - 1; i += 1) {
        answer(true);
        act(() => {
          vi.advanceTimersByTime(1200);
        });
      }

      expect(shownKana()).toBe(missed);
      expect(onAnswer).toHaveBeenCalledTimes(CHARS.length);
      answer(true);
      expect(onAnswer).toHaveBeenLastCalledWith(missed, true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('never re-queues a character missed in the retry, and still runs both stages', () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      const onAnswer = renderRound({ onComplete });

      // Recognize: miss the first, then answer the rest, then miss the retry too.
      for (const stage of [0, 1]) {
        void stage;
        answer(false);
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        for (let i = 0; i < CHARS.length - 1; i += 1) {
          answer(true);
          act(() => {
            vi.advanceTimersByTime(1200);
          });
        }
        answer(false);
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
      }

      // Each stage: three questions plus one retry, and no retry of the retry.
      expect(onAnswer).toHaveBeenCalledTimes((CHARS.length + 1) * 2);
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
