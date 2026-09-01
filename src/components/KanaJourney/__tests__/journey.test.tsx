import { fireEvent, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSet } from '@/lib/kanaCurriculum';
import { type KanaMastery, kanaProgressMap } from '@/lib/kanaProficiency';
import { renderWithProviders } from '@/test/renderWithProviders';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

vi.mock('@/hooks/useSpeech', () => ({
  useSpeech: () => ({ speak: vi.fn(), speakAll: vi.fn(), stop: vi.fn(), speaking: false }),
  speechNeedsGesture: () => false,
  useJapaneseVoice: () => 'ready',
}));

const mockAnswer = vi.fn().mockResolvedValue(undefined);
const mockFinish = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useGameSession', () => ({
  useGameSession: (mode: string) => {
    sessionModes.push(mode);
    return { answer: mockAnswer, finish: mockFinish, comboCount: 0 };
  },
}));

const sessionModes: string[] = [];

import { IslandSession } from '../IslandSession';
import { TrackPath } from '../TrackPath';

function progressFor(setIds: string[], level: KanaMastery) {
  return kanaProgressMap(
    setIds.flatMap((id) => getSet(id)!.entries.map((e) => ({ kana: e.kana, ...level }))),
  );
}

const STARRED: KanaMastery = { correctCount: 2, wrongCount: 0, nextReviewAt: null };

beforeEach(() => {
  vi.clearAllMocks();
  sessionModes.length = 0;
});

describe('TrackPath', () => {
  it('should start a set when its island is tapped', () => {
    const onPlay = vi.fn();
    renderWithProviders(
      <TrackPath track="hiragana" byKana={new Map()} onTrackChange={vi.fn()} onPlay={onPlay} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^あ · い · う · え · お —/ }));
    expect(onPlay).toHaveBeenCalledWith('hira-a');
  });

  it('should announce a locked island and refuse to open it', () => {
    const onPlay = vi.fn();
    renderWithProviders(
      <TrackPath track="hiragana" byKana={new Map()} onTrackChange={vi.fn()} onPlay={onPlay} />,
    );
    const locked = screen.getByRole('button', { name: /^か · き · く · け · こ — locked/ });
    expect(locked).toHaveAttribute('aria-disabled', 'true');
    expect(locked).toHaveAttribute('tabindex', '-1');
    fireEvent.click(locked);
    fireEvent.keyDown(locked, { key: 'Enter' });
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('should open an island from the keyboard', () => {
    const onPlay = vi.fn();
    renderWithProviders(
      <TrackPath track="hiragana" byKana={new Map()} onTrackChange={vi.fn()} onPlay={onPlay} />,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: /^あ · い · う · え · お —/ }), {
      key: ' ',
    });
    expect(onPlay).toHaveBeenCalledWith('hira-a');
  });

  it('should keep katakana shut until three hiragana rows are starred', () => {
    renderWithProviders(
      <TrackPath
        track="hiragana"
        byKana={progressFor(['hira-a', 'hira-ka'], STARRED)}
        onTrackChange={vi.fn()}
        onPlay={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: /Katakana — locked, 2 of 3/ })).toBeDisabled();
    expect(screen.getByText(/Katakana opens after you earn a star/)).toBeInTheDocument();
  });

  it('should switch tracks once katakana is open', () => {
    const onTrackChange = vi.fn();
    renderWithProviders(
      <TrackPath
        track="hiragana"
        byKana={progressFor(['hira-a', 'hira-ka', 'hira-sa'], STARRED)}
        onTrackChange={onTrackChange}
        onPlay={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Katakana' }));
    expect(onTrackChange).toHaveBeenCalledWith('katakana');
  });
});

describe('IslandSession', () => {
  const renderSession = (record = vi.fn().mockResolvedValue(undefined)) => {
    const onExit = vi.fn();
    renderWithProviders(
      <IslandSession setId="hira-a" byKana={new Map()} record={record} onExit={onExit} />,
    );
    return { record, onExit };
  };

  const tapSound = (sound: string) =>
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`: ${sound}$`) }));

  it('should run the whole island inside one kana-journey session', () => {
    renderSession();
    expect(sessionModes[0]).toBe('kana-journey');
  });

  it('should start on the recognize drill', () => {
    renderSession();
    expect(screen.getByText('Look at the character, then tap the sound it makes.')).toBeVisible();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('should award XP and advance the character on every answer', async () => {
    const { record } = renderSession();
    const kana = screen.getByRole('button', { name: 'Tap to hear it' }).textContent!;
    const romaji = getSet('hira-a')!.entries.find((e) => e.kana === kana)!.romaji;
    tapSound(romaji);

    await waitFor(() => expect(mockAnswer).toHaveBeenCalledWith(true));
    expect(record).toHaveBeenCalledWith(kana, true);
  });

  it('should move on to the recall drill without closing the session', () => {
    vi.useFakeTimers();
    try {
      renderSession();
      const romajiOf = (kana: string) =>
        getSet('hira-a')!.entries.find((e) => e.kana === kana)!.romaji;
      for (let i = 0; i < getSet('hira-a')!.entries.length; i++) {
        tapSound(romajiOf(screen.getByRole('button', { name: 'Tap to hear it' }).textContent!));
        act(() => void vi.advanceTimersByTime(1100));
      }
      expect(
        screen.getByText('Hear the sound, then tap the character that writes it.'),
      ).toBeVisible();
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
      expect(mockFinish).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should end the session before leaving when the learner quits', async () => {
    const { onExit } = renderSession();
    fireEvent.click(screen.getByRole('button', { name: 'Quit & Save Progress' }));
    await waitFor(() => expect(mockFinish).toHaveBeenCalled());
    expect(onExit).toHaveBeenCalled();
  });
});
