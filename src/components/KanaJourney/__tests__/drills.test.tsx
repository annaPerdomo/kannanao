import { fireEvent, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const mockSpeak = vi.fn();
vi.mock('@/hooks/useSpeech', () => ({
  useSpeech: () => ({ speak: mockSpeak, speakAll: vi.fn(), stop: vi.fn(), speaking: false }),
  speechNeedsGesture: () => false,
  useJapaneseVoice: () => 'ready',
}));

import { LightningRound } from '../LightningRound';
import { RecallDrill } from '../RecallDrill';
import { RecognizeDrill } from '../RecognizeDrill';

const CHARS = ['あ', 'い', 'う'];

function tap(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

function tapSound(sound: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`: ${sound}$`) }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RecognizeDrill', () => {
  it('should show a character and four sounds to choose from', () => {
    renderWithProviders(
      <RecognizeDrill setId="hira-a" chars={['あ']} onAnswer={vi.fn()} onComplete={vi.fn()} />,
    );
    expect(screen.getByText('Which sound is this?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tap to hear it' })).toHaveTextContent('あ');
    expect(screen.getAllByRole('button', { name: /^Answer [A-D]:/ })).toHaveLength(4);
  });

  it('should report a right answer and play the character', () => {
    const onAnswer = vi.fn();
    renderWithProviders(
      <RecognizeDrill setId="hira-a" chars={['あ']} onAnswer={onAnswer} onComplete={vi.fn()} />,
    );
    tapSound('a');
    expect(onAnswer).toHaveBeenCalledWith('あ', true);
    expect(mockSpeak).toHaveBeenCalledWith('あ');
  });

  it('should report a wrong answer once and ignore a second tap', () => {
    const onAnswer = vi.fn();
    renderWithProviders(
      <RecognizeDrill setId="hira-a" chars={['あ']} onAnswer={onAnswer} onComplete={vi.fn()} />,
    );
    const wrong = screen
      .getAllByRole('button', { name: /^Answer [A-D]:/ })
      .find((b) => !b.textContent?.endsWith('a'))!;
    fireEvent.click(wrong);
    fireEvent.click(wrong);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith('あ', false);
  });

  it('should play the character when the glyph is tapped', () => {
    renderWithProviders(
      <RecognizeDrill setId="hira-a" chars={['あ']} onAnswer={vi.fn()} onComplete={vi.fn()} />,
    );
    tap('Tap to hear it');
    expect(mockSpeak).toHaveBeenCalledWith('あ');
  });

  it('should offer a hint only after a wrong answer, and only behind a tap', () => {
    renderWithProviders(
      <RecognizeDrill setId="hira-a" chars={['あ']} onAnswer={vi.fn()} onComplete={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: 'Show a hint' })).not.toBeInTheDocument();

    const wrong = screen
      .getAllByRole('button', { name: /^Answer [A-D]:/ })
      .find((b) => !b.textContent?.endsWith('a'))!;
    fireEvent.click(wrong);

    expect(screen.queryByText(/ribbon/)).not.toBeInTheDocument();
    tap('Show a hint');
    expect(screen.getByText(/ribbon/)).toBeInTheDocument();
  });

  it('should wait for Next after a wrong answer instead of racing away', () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      renderWithProviders(
        <RecognizeDrill setId="hira-a" chars={['あ']} onAnswer={vi.fn()} onComplete={onComplete} />,
      );
      const wrong = screen
        .getAllByRole('button', { name: /^Answer [A-D]:/ })
        .find((b) => !b.textContent?.endsWith('a'))!;
      fireEvent.click(wrong);
      act(() => void vi.advanceTimersByTime(5000));
      expect(onComplete).not.toHaveBeenCalled();

      tap('Next');
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should advance on its own after a right answer and finish the set once', () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      renderWithProviders(
        <RecognizeDrill setId="hira-a" chars={['あ']} onAnswer={vi.fn()} onComplete={onComplete} />,
      );
      tapSound('a');
      expect(onComplete).not.toHaveBeenCalled();
      act(() => void vi.advanceTimersByTime(1100));
      expect(onComplete).toHaveBeenCalledTimes(1);
      act(() => void vi.advanceTimersByTime(5000));
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should ask every character in the set', () => {
    vi.useFakeTimers();
    try {
      const onAnswer = vi.fn();
      renderWithProviders(
        <RecognizeDrill setId="hira-a" chars={CHARS} onAnswer={onAnswer} onComplete={vi.fn()} />,
      );
      const sounds: Record<string, string> = { あ: 'a', い: 'i', う: 'u' };
      for (let i = 0; i < CHARS.length; i++) {
        const shown = screen.getByRole('button', { name: 'Tap to hear it' }).textContent!;
        tapSound(sounds[shown]);
        act(() => void vi.advanceTimersByTime(1100));
      }
      expect(onAnswer.mock.calls.map((c) => c[0]).sort()).toEqual([...CHARS].sort());
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('RecallDrill', () => {
  it('should show a sound and character tiles to pick from', () => {
    renderWithProviders(
      <RecallDrill setId="hira-a" chars={['あ']} onAnswer={vi.fn()} onComplete={vi.fn()} />,
    );
    expect(screen.getByText('Pick the character')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'あ' })).toBeInTheDocument();
  });

  it('should grade the tile the learner picks', () => {
    const onAnswer = vi.fn();
    renderWithProviders(
      <RecallDrill setId="hira-a" chars={['あ']} onAnswer={onAnswer} onComplete={vi.fn()} />,
    );
    tap('あ');
    expect(onAnswer).toHaveBeenCalledWith('あ', true);
  });

  it('should mark a different character wrong', () => {
    const onAnswer = vi.fn();
    renderWithProviders(
      <RecallDrill
        setId="hira-a"
        chars={['あ']}
        unlocked={['あ', 'い', 'う', 'え']}
        onAnswer={onAnswer}
        onComplete={vi.fn()}
      />,
    );
    tap('い');
    expect(onAnswer).toHaveBeenCalledWith('あ', false);
  });

  it('should never put both characters of a same-sound pair on the board', () => {
    renderWithProviders(
      <RecallDrill
        setId="hira-da"
        chars={['ぢ']}
        unlocked={['じ', 'ず', 'づ', 'か', 'き', 'く']}
        onAnswer={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'ぢ' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'じ' })).not.toBeInTheDocument();
  });

  it('should finish the set after the last character', () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      renderWithProviders(
        <RecallDrill setId="hira-a" chars={['あ']} onAnswer={vi.fn()} onComplete={onComplete} />,
      );
      tap('あ');
      act(() => void vi.advanceTimersByTime(1100));
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('LightningRound', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('should start at zero and count the right answers', () => {
    renderWithProviders(
      <LightningRound setId="hira-a" chars={CHARS} onAnswer={vi.fn()} onComplete={vi.fn()} />,
    );
    expect(screen.getByText('0 right')).toBeInTheDocument();

    const kana = screen.getByRole('button', { name: 'Tap to hear it' }).textContent!;
    tapSound(kana === 'あ' ? 'a' : kana === 'い' ? 'i' : 'u');
    expect(screen.getByText('1 right')).toBeInTheDocument();
  });

  it('should show a filling bar rather than a countdown clock', () => {
    renderWithProviders(
      <LightningRound setId="hira-a" chars={CHARS} onAnswer={vi.fn()} onComplete={vi.fn()} />,
    );
    const bar = screen.getByRole('progressbar', { name: 'Time left' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    act(() => void vi.advanceTimersByTime(22_500));
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(49);
  });

  it('should end after 45 seconds and say so once', () => {
    const onComplete = vi.fn();
    renderWithProviders(
      <LightningRound setId="hira-a" chars={CHARS} onAnswer={vi.fn()} onComplete={onComplete} />,
    );
    act(() => void vi.advanceTimersByTime(44_000));
    expect(onComplete).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(1500));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Time's up!/)).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(10_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should keep asking after every character has come up once', () => {
    const onAnswer = vi.fn();
    renderWithProviders(
      <LightningRound setId="hira-a" chars={['あ']} onAnswer={onAnswer} onComplete={vi.fn()} />,
    );
    for (let i = 0; i < 4; i++) {
      tapSound('a');
      act(() => void vi.advanceTimersByTime(450));
    }
    expect(onAnswer).toHaveBeenCalledTimes(4);
    expect(onAnswer.mock.calls.every((c) => c[0] === 'あ')).toBe(true);
  });
});
