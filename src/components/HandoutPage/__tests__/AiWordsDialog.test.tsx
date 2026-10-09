import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonPlanResponse } from '@/types/lessonPlan';

const mockBuildLessonPlan = vi.fn();
const mockUploadLessonDocument = vi.fn();
vi.mock('@/services/api', () => ({
  buildLessonPlan: (...args: unknown[]) => mockBuildLessonPlan(...args),
  uploadLessonDocument: (...args: unknown[]) => mockUploadLessonDocument(...args),
}));

import { AiWordsDialog } from '../AiWordsDialog';

function planResponse(overrides: Partial<LessonPlanResponse> = {}): LessonPlanResponse {
  return {
    plan: {
      decks: [
        {
          name: 'Deck',
          description: '',
          emoji: '🍜',
          mainViewMode: 'hiragana',
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
    ...overrides,
  };
}

describe('AiWordsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('topic mode submits with weeks, groupId, level and cardsPerDeck', async () => {
    mockBuildLessonPlan.mockResolvedValue(planResponse());
    const onResult = vi.fn();
    renderWithProviders(
      <AiWordsDialog
        open
        mode="topic"
        onClose={vi.fn()}
        groupId="g1"
        defaultLevel="N5"
        onResult={onResult}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Ordering food/), {
      target: { value: 'Ordering at a restaurant' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate words' }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalled());
    expect(mockBuildLessonPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        goal: 'Ordering at a restaurant',
        weeks: 1,
        groupId: 'g1',
        level: 'N5',
        cardsPerDeck: 12,
      }),
    );
  });

  it('text mode uploads the pasted text as a document and sends a fixed goal', async () => {
    mockUploadLessonDocument.mockResolvedValue('org1/doc.txt');
    mockBuildLessonPlan.mockResolvedValue(planResponse());
    renderWithProviders(
      <AiWordsDialog
        open
        mode="text"
        onClose={vi.fn()}
        groupId="g1"
        defaultLevel="N5"
        onResult={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Paste the page/), {
      target: { value: 'page body text' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate words' }));

    await vi.waitFor(() => expect(mockBuildLessonPlan).toHaveBeenCalled());
    expect(mockUploadLessonDocument).toHaveBeenCalledTimes(1);
    const uploaded = mockUploadLessonDocument.mock.calls[0][0] as File;
    expect(uploaded.name).toBe('textbook-page.txt');
    expect(uploaded.type).toBe('text/plain');
    expect(mockBuildLessonPlan.mock.calls[0][0]).toMatchObject({
      goal: 'Pick the vocabulary a learner needs from the attached textbook page.',
      documents: [{ path: 'org1/doc.txt', mimeType: 'text/plain' }],
    });
  });

  it('shows the busy message on a 429', async () => {
    mockBuildLessonPlan.mockRejectedValue(new Error('Too many requests. Please try again later.'));
    renderWithProviders(
      <AiWordsDialog
        open
        mode="topic"
        onClose={vi.fn()}
        groupId="g1"
        defaultLevel="N5"
        onResult={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Ordering food/), {
      target: { value: 'Ordering at a restaurant' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate words' }));

    expect(await screen.findByText('AI is busy — try again in a minute.')).toBeInTheDocument();
  });

  it('opens with the mapped cards and shows the warm-up note via onResult', async () => {
    const response = planResponse({
      warmUp: [{ word: '犬', reading: 'いぬ', meaning: 'dog', deckName: 'Animals', addedAt: null }],
    });
    mockBuildLessonPlan.mockResolvedValue(response);
    const onResult = vi.fn();
    renderWithProviders(
      <AiWordsDialog
        open
        mode="topic"
        onClose={vi.fn()}
        groupId="g1"
        defaultLevel="N5"
        onResult={onResult}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Ordering food/), {
      target: { value: 'Ordering at a restaurant' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate words' }));

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(response));
  });
});
