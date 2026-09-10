import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssignmentsSection } from '@/components/Group/MemberDetail/AssignmentsSection';
import type { MemberDetail } from '@/hooks/useGroup';
import { renderWithProviders } from '@/test/renderWithProviders';

const mockUseDeckWords = vi.fn();

vi.mock('@/hooks/useDeckWords', () => ({
  useDeckWords: (...args: unknown[]) => mockUseDeckWords(...args),
}));

function makeAssignments(): MemberDetail['assignments'] {
  return {
    total: 1,
    completed: 0,
    pending: 1,
    overdue: 0,
    completionRate: 0,
    items: [
      {
        id: 'a1',
        title: null,
        deckName: 'Animals',
        deckEmoji: '🐶',
        deckId: 'deck-1',
        kanaSet: null,
        note: 'Practice daily',
        availableOn: null,
        dueDate: '2026-10-01',
        completedAt: null,
        createdAt: '2026-09-01T00:00:00Z',
        requiredAccuracy: 80,
        requiredMode: 'study',
        progressAccuracy: null,
      },
    ],
  };
}

describe('AssignmentsSection', () => {
  beforeEach(() => {
    mockUseDeckWords.mockReset();
    mockUseDeckWords.mockReturnValue({ words: [], loading: false, error: null });
  });

  it('opens the handout detail dialog when a handout name is clicked', () => {
    renderWithProviders(<AssignmentsSection assignments={makeAssignments()} />);

    fireEvent.click(screen.getByRole('button', { name: "See what's in Animals" }));

    expect(screen.getByText('🐶 Animals')).toBeInTheDocument();
  });
});
