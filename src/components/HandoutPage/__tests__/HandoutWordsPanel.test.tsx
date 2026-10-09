import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HandoutWords } from '@/hooks/useHandoutWords';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

import { card } from './fixtures';

const mockEditCardDialog = vi.fn();
vi.mock('@/components/EditCardDialog', () => ({
  EditCardDialog: (props: {
    open: boolean;
    card: Flashcard | null;
    onSave: (c: Flashcard) => void;
  }) => {
    mockEditCardDialog(props);
    return props.open && props.card ? (
      <button onClick={() => props.onSave({ ...props.card!, word: '犬' })}>fake save</button>
    ) : null;
  },
}));
vi.mock('@/components/HandoutPage/AddWordsFlow', () => ({ AddWordsFlow: () => null }));

import { HandoutWordsPanel } from '@/components/HandoutPage/HandoutWordsPanel';

function data(): HandoutWords {
  return {
    deck: { id: 'd1', name: 'Food', emoji: null },
    learnerCount: 2,
    words: [
      { card: card('c1', '猫'), seenCount: 2, strongCount: 2, trickyCount: 0 },
      { card: card('c2', '鳥'), seenCount: 1, strongCount: 0, trickyCount: 1 },
      { card: card('c3', '魚'), seenCount: 0, strongCount: 0, trickyCount: 0 },
    ],
    learner: null,
  };
}

const edits = {
  saving: false,
  error: null as string | null,
  clearError: vi.fn(),
  updateWord: vi.fn(),
  removeWord: vi.fn(),
  addWords: vi.fn(),
  copyWords: vi.fn(),
};

function setup(overrides: Partial<Parameters<typeof HandoutWordsPanel>[0]> = {}) {
  const onSaved = vi.fn();
  renderWithProviders(
    <HandoutWordsPanel
      groupId="g1"
      deckId="d1"
      data={data()}
      loading={false}
      error={null}
      edits={edits}
      onSaved={onSaved}
      {...overrides}
    />,
  );
  return { onSaved };
}

describe('HandoutWordsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    edits.updateWord.mockResolvedValue(true);
    edits.removeWord.mockResolvedValue(true);
  });

  it('lists every word with no scroll cap and counts each filter', () => {
    setup();
    expect(screen.getByText('猫')).toBeInTheDocument();
    expect(screen.getByText('鳥')).toBeInTheDocument();
    expect(screen.getByText('魚')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All (3)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tricky (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not seen yet (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Strong for most (1)' })).toBeInTheDocument();
  });

  it('narrows the list to tricky words', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tricky (1)' }));
    expect(screen.getByText('鳥')).toBeInTheDocument();
    expect(screen.queryByText('猫')).not.toBeInTheDocument();
    expect(screen.queryByText('魚')).not.toBeInTheDocument();
  });

  it('edits a word through the card dialog and confirms the save', async () => {
    const { onSaved } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit 猫' }));
    fireEvent.click(screen.getByRole('button', { name: 'fake save' }));
    expect(edits.updateWord).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', word: '犬' }),
    );
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith('Word saved'));
  });

  it('asks before removing a word, then removes it', async () => {
    const { onSaved } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove 鳥' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Remove 鳥?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove word' }));
    expect(edits.removeWord).toHaveBeenCalledWith('c2');
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith('Word removed'));
  });

  it('hides group insight and filters when no learners have joined', () => {
    setup({ data: { ...data(), learnerCount: 0 } });
    expect(screen.queryByRole('button', { name: /^All/ })).not.toBeInTheDocument();
    expect(screen.getByText(/No learners in this group yet/)).toBeInTheDocument();
  });

  it('shows the save error with a dismiss', () => {
    setup({ edits: { ...edits, error: 'boom' } });
    expect(screen.getByText("Couldn't save that word change. Try again.")).toBeInTheDocument();
  });

  it('invites adding words when the deck is empty', () => {
    setup({ data: { ...data(), words: [] } });
    expect(screen.getByText(/No words yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add words' })).toBeEnabled();
  });
});
