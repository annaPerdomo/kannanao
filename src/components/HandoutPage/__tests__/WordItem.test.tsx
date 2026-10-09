import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { GeneratedCard } from '@/types/flashcard';

import { card } from './fixtures';

const mockGenerateFlashcards = vi.fn();
vi.mock('@/services/api', () => ({
  generateFlashcards: (...args: unknown[]) => mockGenerateFlashcards(...args),
}));

import { WordItem } from '../WordItem';

function generated(overrides: Partial<GeneratedCard> = {}): GeneratedCard {
  return {
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    image_query: 'cat',
    example_jp: '猫がいます',
    example_en: 'There is a cat',
    card_type: 'word',
    jlpt_level: 'N5',
    ...overrides,
  };
}

function setup(overrides: Partial<Parameters<typeof WordItem>[0]> = {}) {
  const onFilled = vi.fn();
  const onFillError = vi.fn();
  renderWithProviders(
    <WordItem
      card={card('c1', '猫')}
      onEdit={vi.fn()}
      onRemove={vi.fn()}
      onFilled={onFilled}
      onFillError={onFillError}
      {...overrides}
    />,
  );
  return { onFilled, onFillError };
}

describe('WordItem — fill with AI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the fill button when a field is empty', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Fill in with AI' })).toBeInTheDocument();
  });

  it('hides the fill button once every field is filled in', () => {
    setup({
      card: {
        ...card('c1', '猫'),
        reading: 'ねこ',
        meaning: 'cat',
        example_jp: '猫がいます',
      },
    });
    expect(screen.queryByRole('button', { name: 'Fill in with AI' })).not.toBeInTheDocument();
  });

  it('calls generate then onFilled with the merged card', async () => {
    mockGenerateFlashcards.mockResolvedValue([generated()]);
    const { onFilled } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Fill in with AI' }));

    await vi.waitFor(() => expect(onFilled).toHaveBeenCalled());
    expect(mockGenerateFlashcards).toHaveBeenCalledWith({ pendingWords: ['猫'] });
    expect(onFilled).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', reading: 'ねこ', meaning: 'meaning-c1' }),
    );
  });

  it('reports a generation error through onFillError', async () => {
    mockGenerateFlashcards.mockRejectedValue(new Error('boom'));
    const { onFillError } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Fill in with AI' }));

    await vi.waitFor(() => expect(onFillError).toHaveBeenCalledWith('boom'));
  });
});
