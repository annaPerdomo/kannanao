import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataError } from '@/lib/dataError';
import { renderWithProviders } from '@/test/renderWithProviders';

const mockPush = vi.fn();
const searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

vi.mock('../IslandSession', () => ({
  IslandSession: ({ setId }: { setId: string }) => <div>playing {setId}</div>,
}));

import { KanaJourneyScreen } from '../KanaJourneyScreen';

beforeEach(() => {
  vi.clearAllMocks();
  progress.byKana = new Map();
  progress.loading = false;
  progress.error = null;
  searchParams.delete('set');
});

describe('KanaJourneyScreen', () => {
  it('should show the path once progress has loaded', () => {
    renderWithProviders(<KanaJourneyScreen />);
    expect(screen.getByRole('button', { name: /^あ · い · う · え · お —/ })).toBeInTheDocument();
  });

  it('should wait on a spinner instead of an empty path', () => {
    progress.loading = true;
    progress.byKana = null as unknown as Map<string, never>;
    renderWithProviders(<KanaJourneyScreen />);
    expect(screen.getByText('Opening your path…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^あ ·/ })).not.toBeInTheDocument();
  });

  it('should tell a failed load apart from an empty one, and offer a retry', () => {
    progress.error = new DataError('upstream', 'down');
    progress.byKana = null as unknown as Map<string, never>;
    renderWithProviders(<KanaJourneyScreen />);
    expect(screen.queryByRole('button', { name: /^あ ·/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(progress.retry).toHaveBeenCalled();
  });

  it('should drop into the session for the island the learner picked', () => {
    renderWithProviders(<KanaJourneyScreen />);
    fireEvent.click(screen.getByRole('button', { name: /^あ · い · う · え · お —/ }));
    expect(screen.getByText('playing hira-a')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /^あ · い · う · え · お —/ })).toBeInTheDocument();
  });

  it('should go back to the review hub from the header', () => {
    renderWithProviders(<KanaJourneyScreen />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(mockPush).toHaveBeenCalledWith('/review');
  });
});
