import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonPlanResponse } from '@/types/lessonPlan';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

const mockGenerate = vi.fn();
vi.mock('@/hooks/useGenerateFlashcards', () => ({
  useGenerateFlashcards: () => ({
    generating: false,
    error: null,
    generate: mockGenerate,
    regenerate: vi.fn(),
  }),
}));

const mockReuseThenFetch = vi.fn();
vi.mock('@/services/cardPipeline', () => ({
  reuseThenFetch: (...args: unknown[]) => mockReuseThenFetch(...args),
}));

vi.mock('@/components/AddCards', () => ({ AddCardsModal: () => null }));
vi.mock('@/components/AddExistingCardsDialog', () => ({ AddExistingCardsDialog: () => null }));

vi.mock('@/components/PdfImportModal', () => ({
  PdfImportModal: ({
    open,
    onAddCards,
  }: {
    open: boolean;
    onAddCards: (cards: unknown[]) => void;
  }) =>
    open ? (
      <button onClick={() => onAddCards([{ word: '猫', card_type: 'word' }])}>pdf-import</button>
    ) : null,
}));

vi.mock('../AiWordsDialog', () => ({
  AiWordsDialog: ({
    open,
    onResult,
  }: {
    open: boolean;
    onResult: (result: LessonPlanResponse) => void;
  }) =>
    open ? (
      <button
        onClick={() =>
          onResult({
            plan: {
              decks: [
                {
                  name: 'Deck',
                  description: '',
                  emoji: '🍜',
                  mainViewMode: 'kanji',
                  cards: [
                    {
                      word: '猫',
                      reading: 'ねこ',
                      meaning: 'cat',
                      exampleJp: '猫がいます',
                      exampleEn: 'There is a cat',
                      jlptLevel: 'N5',
                    },
                  ],
                },
              ],
            },
            warmUp: [{ word: '犬', reading: 'いぬ', meaning: 'dog', deckName: 'D', addedAt: null }],
          })
        }
      >
        ai-result
      </button>
    ) : null,
}));

vi.mock('../QuizletWordsDialog', () => ({
  QuizletWordsDialog: ({ open, onPick }: { open: boolean; onPick: (set: unknown) => void }) =>
    open ? (
      <button
        onClick={() =>
          onPick({
            url: 'https://quizlet.com/1/set',
            name: 'Set',
            include: true,
            cards: [
              {
                word: '猫',
                reading: 'ねこ',
                meaning: 'cat',
                exampleJp: '',
                exampleEn: '',
                imageQuery: '',
                imageUrl: null,
                jlptLevel: null,
                include: true,
                cardType: 'word',
              },
              {
                word: '犬',
                reading: 'いぬ',
                meaning: 'dog',
                exampleJp: '',
                exampleEn: '',
                imageQuery: '',
                imageUrl: null,
                jlptLevel: null,
                include: false,
                cardType: 'word',
              },
            ],
          })
        }
      >
        quizlet-pick
      </button>
    ) : null,
}));

vi.mock('@/components/ReviewCardsDialog', () => ({
  ReviewCardsDialog: ({ open, cards }: { open: boolean; cards: { word: string }[] }) =>
    open ? (
      <div data-testid="review-dialog">
        {cards.map((c) => (
          <span key={c.word}>{c.word}</span>
        ))}
      </div>
    ) : null,
}));

import { AddWordsFlow } from '../AddWordsFlow';
import type { AddWordsSource } from '../AddWordsMenu';

function Harness() {
  const [source, setSource] = useState<AddWordsSource | null>(null);
  return (
    <>
      <button onClick={() => setSource('pdf')}>open-pdf</button>
      <button onClick={() => setSource('topic')}>open-topic</button>
      <button onClick={() => setSource('quizlet')}>open-quizlet</button>
      <AddWordsFlow
        activeSource={source}
        onClose={() => setSource(null)}
        groupId="g1"
        deckId="d1"
        defaultLevel="N5"
        onAdd={vi.fn().mockResolvedValue(true)}
        onCopy={vi.fn().mockResolvedValue(true)}
        onInfo={mockOnInfo}
      />
    </>
  );
}

const mockOnInfo = vi.fn();

describe('AddWordsFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AI result opens the review dialog with the mapped cards and shows the warm-up toast', async () => {
    mockReuseThenFetch.mockResolvedValue([{ word: '猫' }]);
    renderWithProviders(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'open-topic' }));
    fireEvent.click(screen.getByRole('button', { name: 'ai-result' }));

    await vi.waitFor(() => expect(screen.getByTestId('review-dialog')).toBeInTheDocument());
    expect(screen.getByText('猫')).toBeInTheDocument();
    expect(mockReuseThenFetch).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ word: '猫', card_type: 'word' })]),
      'd1',
      'kanji',
    );
    expect(mockOnInfo).toHaveBeenCalledWith(expect.stringContaining('1'), 'info');
  });

  it('Quizlet pick opens the review dialog with only the kept cards', () => {
    renderWithProviders(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'open-quizlet' }));
    fireEvent.click(screen.getByRole('button', { name: 'quizlet-pick' }));

    expect(screen.getByTestId('review-dialog')).toBeInTheDocument();
    expect(screen.getByText('猫')).toBeInTheDocument();
    expect(screen.queryByText('犬')).not.toBeInTheDocument();
  });

  it('the PDF source can be reopened after a successful import', async () => {
    mockReuseThenFetch.mockResolvedValue([{ word: '猫' }]);
    renderWithProviders(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'open-pdf' }));
    expect(screen.getByRole('button', { name: 'pdf-import' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'pdf-import' }));

    await vi.waitFor(() => expect(screen.getByTestId('review-dialog')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'open-pdf' }));
    expect(screen.getByRole('button', { name: 'pdf-import' })).toBeInTheDocument();
  });
});
