import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataError } from '@/lib/dataError';
import { clearChainState, writeChainState } from '@/lib/practiceChain';
import { renderWithProviders } from '@/test/renderWithProviders';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => searchParams,
}));

const progress = {
  byKana: new Map(),
  loading: false,
  error: null as DataError | null,
  retry: vi.fn(),
  record: vi.fn(),
};
vi.mock('@/hooks/useKanaProgress', () => ({ useKanaProgress: () => progress }));

vi.mock('../KanaCheck', () => ({
  KanaCheck: ({ onReview }: { onReview: () => void }) => (
    <button type="button" onClick={onReview}>
      checking
    </button>
  ),
}));

vi.mock('../KanaSession', () => ({
  KanaSession: ({
    setId,
    kana,
    chars,
    onExit,
  }: {
    setId?: string;
    kana?: string;
    chars?: string[];
    onExit: () => void;
  }) => (
    <div>
      playing {setId ?? kana ?? chars?.join(' ')}
      <button type="button" onClick={onExit}>
        quit
      </button>
    </div>
  ),
}));

import { KanaJourneyScreen } from '../KanaJourneyScreen';

beforeEach(() => {
  vi.clearAllMocks();
  progress.byKana = new Map();
  progress.loading = false;
  progress.error = null;
  searchParams.delete('set');
  searchParams.delete('chain');
  clearChainState();
});

describe('KanaJourneyScreen', () => {
  it('should show the chart once progress has loaded', () => {
    renderWithProviders(<KanaJourneyScreen />);
    expect(screen.getByRole('button', { name: /^あ —/ })).toBeInTheDocument();
  });

  it('should wait on a spinner instead of an empty chart', () => {
    progress.loading = true;
    progress.byKana = null as unknown as Map<string, never>;
    renderWithProviders(<KanaJourneyScreen />);
    expect(screen.getByText('Opening your chart…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^あ —/ })).not.toBeInTheDocument();
  });

  it('should tell a failed load apart from an empty one, and offer a retry', () => {
    progress.error = new DataError('upstream', 'down');
    progress.byKana = null as unknown as Map<string, never>;
    renderWithProviders(<KanaJourneyScreen />);
    expect(screen.queryByRole('button', { name: /^あ —/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(progress.retry).toHaveBeenCalled();
  });

  it('should drill the single character whose cell the learner tapped', () => {
    renderWithProviders(<KanaJourneyScreen />);
    fireEvent.click(screen.getByRole('button', { name: /^ぬ —/ }));
    expect(screen.getByText('playing ぬ')).toBeInTheDocument();
  });

  it('should drill a whole family from its column header', () => {
    renderWithProviders(<KanaJourneyScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Practise the か row' }));
    expect(screen.getByText('playing hira-ka')).toBeInTheDocument();
  });

  it('should start the Review button on the queue, not on a row', () => {
    renderWithProviders(<KanaJourneyScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByText('playing あ い う え お')).toBeInTheDocument();
  });

  it('should open the assigned row straight away from an assignment link', () => {
    searchParams.set('set', 'kata-ka');
    renderWithProviders(<KanaJourneyScreen />);
    expect(screen.getByText('playing kata-ka')).toBeInTheDocument();
  });

  it('should ignore a ?set= that names no real row', () => {
    searchParams.set('set', 'hira-nope');
    renderWithProviders(<KanaJourneyScreen />);
    expect(screen.queryByText(/^playing /)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^あ —/ })).toBeInTheDocument();
  });

  it('should offer the quick check to a learner the app knows nothing about', () => {
    renderWithProviders(<KanaJourneyScreen />);
    expect(
      screen.getByText('Already read some of these? The quick check takes a minute.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quick check' }));
    expect(screen.getByRole('button', { name: 'checking' })).toBeInTheDocument();
  });

  it('should keep the check on offer for someone back after a summer', () => {
    progress.byKana = new Map(
      [...'あいうえおかきくけこ'].map((kana) => [kana, { correctCount: 9, wrongCount: 0 }]),
    );
    renderWithProviders(<KanaJourneyScreen />);
    expect(
      screen.queryByText('Already read some of these? The quick check takes a minute.'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quick check' })).toBeInTheDocument();
  });

  it('should hand the learner from the check straight into a review', () => {
    renderWithProviders(<KanaJourneyScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Quick check' }));
    fireEvent.click(screen.getByRole('button', { name: 'checking' }));
    expect(screen.getByText(/^playing /)).toBeInTheDocument();
  });

  it('should go back to the review hub from the header', () => {
    renderWithProviders(<KanaJourneyScreen />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(mockPush).toHaveBeenCalledWith('/review');
  });

  it('should return to the chart on quitting a row picked outside a chain', () => {
    renderWithProviders(<KanaJourneyScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Practise the か row' }));
    fireEvent.click(screen.getByRole('button', { name: 'quit' }));
    expect(mockPush).not.toHaveBeenCalledWith('/review');
    expect(screen.getByRole('button', { name: /^あ —/ })).toBeInTheDocument();
  });

  it('should abandon the whole chain on quitting the kana leg', () => {
    searchParams.set('set', 'hira-ka');
    searchParams.set('chain', 'daily');
    writeChainState({
      kind: 'daily',
      deckId: '',
      index: 0,
      legs: [{ step: 'goal', mode: 'kana-journey', kanaSet: 'hira-ka' }],
      cardIds: null,
      assignmentId: null,
      requiredMode: null,
      requiredAccuracy: null,
      cardCount: null,
    });
    renderWithProviders(<KanaJourneyScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'quit' }));
    expect(mockPush).toHaveBeenCalledWith('/review');
  });
});
