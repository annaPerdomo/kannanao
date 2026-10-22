import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const generate = vi.fn();
const regenerate = vi.fn();
const clearJustGenerated = vi.fn();
let sentencesState = {
  sentences: [] as { id: string }[],
  loading: false,
  generating: false,
  error: null as string | null,
  justGenerated: false,
  generate,
  regenerate,
  clearJustGenerated,
};
vi.mock('@/hooks/usePracticeSentences', () => ({
  usePracticeSentences: () => sentencesState,
}));

let isMemberAccount = false;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isMemberAccount }),
}));

import { SentencesStatus } from '../SentencesStatus';

function sentence(id: string) {
  return { id };
}

describe('SentencesStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isMemberAccount = false;
    sentencesState = {
      sentences: [],
      loading: false,
      generating: false,
      error: null,
      justGenerated: false,
      generate,
      regenerate,
      clearJustGenerated,
    };
  });

  it('renders nothing for a member account', () => {
    isMemberAccount = true;
    sentencesState.sentences = [sentence('s1'), sentence('s2'), sentence('s3')];
    const { container } = renderWithProviders(<SentencesStatus deckId="d1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while loading', () => {
    sentencesState.loading = true;
    const { container } = renderWithProviders(<SentencesStatus deckId="d1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows ready status and a link to try it when there are enough sentences', () => {
    sentencesState.sentences = [
      sentence('s1'),
      sentence('s2'),
      sentence('s3'),
      sentence('s4'),
      sentence('s5'),
    ];
    renderWithProviders(<SentencesStatus deckId="d1" />);
    expect(screen.getByText(/5 sentences ready/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Try it' });
    expect(link).toHaveAttribute('href', '/deck/d1/practice/kotoba-bubble');
    expect(screen.queryByRole('button', { name: 'Make sentences' })).not.toBeInTheDocument();
  });

  it('calls generate when there are no sentences', () => {
    renderWithProviders(<SentencesStatus deckId="d1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Make sentences' }));
    expect(generate).toHaveBeenCalledTimes(1);
    expect(regenerate).not.toHaveBeenCalled();
  });

  it('calls regenerate when there are 1-2 sentences', () => {
    sentencesState.sentences = [sentence('s1'), sentence('s2')];
    renderWithProviders(<SentencesStatus deckId="d1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Make sentences' }));
    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(generate).not.toHaveBeenCalled();
  });

  it('disables the button while generating', () => {
    sentencesState.generating = true;
    renderWithProviders(<SentencesStatus deckId="d1" />);
    expect(screen.getByRole('button', { name: 'Make sentences' })).toBeDisabled();
  });

  it('keeps the row and Make button visible after a failed generate', () => {
    sentencesState.error = 'Could not make sentences.';
    renderWithProviders(<SentencesStatus deckId="d1" />);
    expect(screen.getByText('Could not make sentences.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make sentences' })).toBeInTheDocument();
  });

  it('shows the few-sentences copy when there are some but not enough', () => {
    sentencesState.sentences = [sentence('s1'), sentence('s2')];
    renderWithProviders(<SentencesStatus deckId="d1" />);
    expect(screen.getByText(/Only 2 sentences so far/)).toBeInTheDocument();
  });

  it('shows only the error alert when the initial load failed, with no Make button', () => {
    sentencesState.loading = true;
    sentencesState.error = 'Could not load sentences.';
    const { rerender } = renderWithProviders(<SentencesStatus deckId="d1" />);
    sentencesState.loading = false;
    rerender(<SentencesStatus deckId="d1" />);
    expect(screen.getByText('Could not load sentences.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make sentences' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Sentence Builder is skipped/)).not.toBeInTheDocument();
  });

  describe('justGenerated', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows a success alert and clears it after 4 seconds', () => {
      sentencesState.sentences = [sentence('s1'), sentence('s2'), sentence('s3')];
      sentencesState.justGenerated = true;
      renderWithProviders(<SentencesStatus deckId="d1" />);
      expect(screen.getByText(/3 sentences made/)).toBeInTheDocument();
      vi.advanceTimersByTime(4000);
      expect(clearJustGenerated).toHaveBeenCalledTimes(1);
    });
  });
});
