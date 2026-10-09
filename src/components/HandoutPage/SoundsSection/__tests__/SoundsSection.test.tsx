import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

const setKanaSets = vi.fn();
const clearError = vi.fn();
let edits = { saving: false, error: null as string | null, clearError, setKanaSets };
vi.mock('@/hooks/useLessonEdits', () => ({ useLessonEdits: () => edits }));

import { SoundsSection } from '../index';

function card(reading: string): Flashcard {
  return {
    id: reading,
    deckId: 'd1',
    word: reading,
    reading,
    meaning: '',
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
  };
}

describe('SoundsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    edits = { saving: false, error: null, clearError, setKanaSets };
    setKanaSets.mockResolvedValue(true);
  });

  it('suggests rows that appear in the words', () => {
    renderWithProviders(
      <SoundsSection
        groupId="g1"
        deckId="d1"
        cards={[card('さかな')]}
        kanaSets={[]}
        handedOut={false}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByText('These rows appear in your words:')).toBeInTheDocument();
    expect(screen.getByText('か')).toBeInTheDocument();
    expect(screen.getByText('さ')).toBeInTheDocument();
    expect(screen.getByText('な')).toBeInTheDocument();
  });

  it('adds a suggested row sorted into the chosen list', async () => {
    renderWithProviders(
      <SoundsSection
        groupId="g1"
        deckId="d1"
        cards={[card('さかな')]}
        kanaSets={['hira-na']}
        handedOut={false}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('か'));

    await vi.waitFor(() => expect(setKanaSets).toHaveBeenCalledWith('d1', ['hira-ka', 'hira-na']));
  });

  it('removes a chosen row', async () => {
    renderWithProviders(
      <SoundsSection
        groupId="g1"
        deckId="d1"
        cards={[]}
        kanaSets={['hira-a', 'hira-ka']}
        handedOut={false}
        onSaved={vi.fn()}
      />,
    );

    const chip = screen.getByText('あ').closest('.MuiChip-root');
    const deleteIcon = chip?.querySelector('[data-testid="CancelIcon"]');
    expect(deleteIcon).toBeTruthy();
    fireEvent.click(deleteIcon as Element);

    await vi.waitFor(() => expect(setKanaSets).toHaveBeenCalledWith('d1', ['hira-ka']));
  });

  it('reverts the chip and shows an alert when the save fails', async () => {
    setKanaSets.mockResolvedValue(false);
    edits = { saving: false, error: 'Failed to update sound rows.', clearError, setKanaSets };
    renderWithProviders(
      <SoundsSection
        groupId="g1"
        deckId="d1"
        cards={[]}
        kanaSets={['hira-a', 'hira-ka']}
        handedOut={false}
        onSaved={vi.fn()}
      />,
    );

    const chip = screen.getByText('か').closest('.MuiChip-root');
    fireEvent.click(chip?.querySelector('[data-testid="CancelIcon"]') as Element);

    await vi.waitFor(() => expect(setKanaSets).toHaveBeenCalledWith('d1', ['hira-a']));
    expect(await screen.findByText('Failed to update sound rows.')).toBeInTheDocument();
    expect(screen.getByText('あ')).toBeInTheDocument();
    expect(screen.getByText('か')).toBeInTheDocument();
  });

  it('drops stale optimistic state when keyed by deckId and rerendered for another week', () => {
    const { rerender } = renderWithProviders(
      <SoundsSection
        key="d1"
        groupId="g1"
        deckId="d1"
        cards={[]}
        kanaSets={['hira-a']}
        handedOut={false}
        onSaved={vi.fn()}
      />,
    );

    setKanaSets.mockReturnValue(new Promise(() => {}));
    const chip = screen.getByText('あ').closest('.MuiChip-root');
    fireEvent.click(chip?.querySelector('[data-testid="CancelIcon"]') as Element);
    expect(screen.queryByText('あ')).not.toBeInTheDocument();

    rerender(
      <SoundsSection
        key="d2"
        groupId="g1"
        deckId="d2"
        cards={[]}
        kanaSets={['hira-ka']}
        handedOut={false}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByText('か')).toBeInTheDocument();
    expect(screen.queryByText('あ')).not.toBeInTheDocument();
  });

  it('disables adding past the row cap', () => {
    const hiraganaIds = [
      'hira-a',
      'hira-ka',
      'hira-sa',
      'hira-ta',
      'hira-na',
      'hira-ha',
      'hira-ma',
      'hira-ya',
    ];
    renderWithProviders(
      <SoundsSection
        groupId="g1"
        deckId="d1"
        cards={[card('さかな')]}
        kanaSets={hiraganaIds}
        handedOut={false}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByText('Up to 8 rows per lesson')).toBeInTheDocument();
    expect(screen.queryByText('These rows appear in your words:')).not.toBeInTheDocument();
  });

  it('saves once from the picker when Done is pressed', async () => {
    renderWithProviders(
      <SoundsSection
        groupId="g1"
        deckId="d1"
        cards={[]}
        kanaSets={[]}
        handedOut={false}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'More rows' }));
    fireEvent.click(screen.getByText('あ'));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(setKanaSets).toHaveBeenCalledTimes(1);
    expect(setKanaSets).toHaveBeenCalledWith('d1', ['hira-a']);
  });
});
