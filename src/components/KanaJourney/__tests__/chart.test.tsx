import { fireEvent, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getKanaEntry, getSet } from '@/lib/kanaCurriculum';
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
const sessionOptions: { kanaSet?: string | null }[] = [];
vi.mock('@/hooks/useGameSession', () => ({
  useGameSession: (mode: string, options: { kanaSet?: string | null }) => {
    sessionModes.push(mode);
    sessionOptions.push(options);
    return { answer: mockAnswer, finish: mockFinish, comboCount: 0 };
  },
}));

const sessionModes: string[] = [];

import { KanaChart } from '../KanaChart';
import { KanaSession } from '../KanaSession';
import { ReviewButton } from '../ReviewButton';

function progressFor(setIds: string[], level: KanaMastery) {
  return kanaProgressMap(
    setIds.flatMap((id) => getSet(id)!.entries.map((e) => ({ kana: e.kana, ...level }))),
  );
}

const SOLID: KanaMastery = { correctCount: 12, wrongCount: 0, nextReviewAt: null };
const RUSTY: KanaMastery = { ...SOLID, lastReviewedAt: '2020-01-01T00:00:00Z', intervalDays: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  sessionModes.length = 0;
  sessionOptions.length = 0;
});

function renderChart(overrides: Partial<Parameters<typeof KanaChart>[0]> = {}) {
  const props = {
    track: 'hiragana' as const,
    byKana: new Map(),
    onTrackChange: vi.fn(),
    onPlayRow: vi.fn(),
    onPlayKana: vi.fn(),
    ...overrides,
  };
  renderWithProviders(<KanaChart {...props} />);
  return props;
}

describe('KanaChart', () => {
  it('should drill one character when its cell is tapped', () => {
    const { onPlayKana } = renderChart();
    fireEvent.click(screen.getByRole('button', { name: 'ぬ — nu, new' }));
    expect(onPlayKana).toHaveBeenCalledWith('ぬ');
  });

  it('should open a cell from the keyboard', () => {
    const { onPlayKana } = renderChart();
    fireEvent.keyDown(screen.getByRole('button', { name: /^ぬ —/ }), { key: ' ' });
    expect(onPlayKana).toHaveBeenCalledWith('ぬ');
  });

  it('should drill the whole family from its column header', () => {
    const { onPlayRow } = renderChart();
    fireEvent.click(screen.getByRole('button', { name: 'Practise the か row' }));
    expect(onPlayRow).toHaveBeenCalledWith('hira-ka');
  });

  it('should keep tab order あ → ん whichever way the chart is drawn', () => {
    renderChart();
    const cells = screen.getAllByRole('button', { name: /^[あん] —/ });
    expect(cells.map((c) => c.getAttribute('aria-label')?.[0])).toEqual(['あ', 'ん']);
  });

  it('should label the vowel rows for a learner hunting for one cell', () => {
    renderChart();
    expect(screen.getAllByText('u').length).toBeGreaterThan(0);
  });

  it('should say in words how well each character is read, never a number', () => {
    renderChart({ byKana: progressFor(['hira-a'], SOLID) });
    expect(screen.getByRole('button', { name: 'あ — a, solid' })).toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('should draw the whole chart including the marked and two-part rows', () => {
    renderChart();
    expect(screen.getByRole('button', { name: /^が —/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^にゃ —/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ん —/ })).toBeInTheDocument();
  });

  it('should let a learner into katakana on the first visit', () => {
    const { onTrackChange } = renderChart();
    const katakana = screen.getByRole('tab', { name: 'Katakana' });
    expect(katakana).not.toBeDisabled();
    fireEvent.click(katakana);
    expect(onTrackChange).toHaveBeenCalledWith('katakana');
  });

  it('should never lock anything', () => {
    renderChart();
    expect(screen.queryByText(/lock/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /locked/i })).not.toBeInTheDocument();
  });
});

describe('ReviewButton', () => {
  it('should count what is waiting in plain words', () => {
    renderWithProviders(
      <ReviewButton byKana={progressFor(['hira-a'], RUSTY)} onReview={vi.fn()} />,
    );
    expect(screen.getByText('5 characters to brush up')).toBeInTheDocument();
  });

  it('should point a learner with no history at the first row, not at a brush-up', () => {
    renderWithProviders(<ReviewButton byKana={new Map()} onReview={vi.fn()} />);
    expect(screen.getByText('Start with the あ row')).toBeInTheDocument();
    expect(screen.queryByText(/brush up/)).not.toBeInTheDocument();
  });

  it('should drop the hint once she has answered enough to be ordered by', () => {
    const byKana = progressFor(['hira-a', 'hira-ka', 'hira-sa'], SOLID);
    renderWithProviders(<ReviewButton byKana={byKana} onReview={vi.fn()} />);
    expect(screen.queryByText(/^Start with/)).not.toBeInTheDocument();
  });

  it('should start the review when tapped', () => {
    const onReview = vi.fn();
    renderWithProviders(<ReviewButton byKana={new Map()} onReview={onReview} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onReview).toHaveBeenCalled();
  });
});

describe('KanaSession', () => {
  const renderSession = (
    request: { setId?: string; kana?: string; chars?: string[] },
    record = vi.fn().mockResolvedValue(undefined),
  ) => {
    const onExit = vi.fn();
    renderWithProviders(
      <KanaSession {...request} byKana={new Map()} record={record} onExit={onExit} />,
    );
    return { record, onExit };
  };

  const tapSound = (sound: string) =>
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`: ${sound}$`) }));

  it('should run the whole session inside one kana-journey row', () => {
    renderSession({ setId: 'hira-a' });
    expect(sessionModes[0]).toBe('kana-journey');
    expect(sessionOptions[0].kanaSet).toBe('hira-a');
  });

  it('should not stamp a row on a mixed review, which would complete an assignment', () => {
    renderSession({ chars: ['あ', 'カ', 'にゃ'] });
    expect(sessionOptions[0].kanaSet).toBeNull();
  });

  it('should drill exactly the characters it was handed', async () => {
    const { record } = renderSession({ chars: ['ぬ', 'め', 'な'] });
    const shown = screen.getByRole('button', { name: 'Tap to hear it' }).textContent!;
    expect(['ぬ', 'め', 'な']).toContain(shown);
    tapSound(getKanaEntry(shown)!.romaji);
    await waitFor(() => expect(record).toHaveBeenCalledWith(shown, true));
  });

  it('should drill a tapped cell with its look-alikes, never alone', () => {
    renderSession({ kana: 'ぬ' });
    expect(screen.getByText('ぬ', { selector: 'h1,h2,h3,h4,h5,h6' })).toBeInTheDocument();
    expect(sessionOptions[0].kanaSet).toBeNull();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('should skip the lightning round when there is too little to tell apart', () => {
    renderSession({ chars: ['あ', 'い'] });
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('should title a mixed queue without naming one row', () => {
    renderSession({ chars: ['あ', 'カ', 'にゃ'] });
    expect(screen.getByText('Brush-up')).toBeInTheDocument();
  });

  it('should move on to the recall drill without closing the session', () => {
    vi.useFakeTimers();
    try {
      renderSession({ setId: 'hira-a' });
      const romajiOf = (kana: string) =>
        getSet('hira-a')!.entries.find((e) => e.kana === kana)!.romaji;
      for (let i = 0; i < getSet('hira-a')!.entries.length; i++) {
        tapSound(romajiOf(screen.getByRole('button', { name: 'Tap to hear it' }).textContent!));
        act(() => void vi.advanceTimersByTime(1100));
      }
      expect(
        screen.getByText('Hear the sound, then tap the character that writes it.'),
      ).toBeVisible();
      expect(mockFinish).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should end the session before leaving when the learner quits', async () => {
    const { onExit } = renderSession({ setId: 'hira-a' });
    fireEvent.click(screen.getByRole('button', { name: 'Quit & Save Progress' }));
    await waitFor(() => expect(mockFinish).toHaveBeenCalled());
    expect(onExit).toHaveBeenCalled();
  });
});
