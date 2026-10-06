import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isMemberAccount: false, loading: false }),
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({
    groups: [{ id: 'g1', name: 'Japanese 1', emoji: null }],
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/components/MaterialsBuilder/LessonLibrary', () => ({
  LessonLibrary: ({ groupId }: { groupId: string }) => <div>lesson-library-{groupId}</div>,
}));

vi.mock('@/components/MaterialsBuilder/LessonSetBuilder', () => ({
  LessonSetBuilder: () => <div>lesson-set-builder</div>,
}));
vi.mock('@/components/MaterialsBuilder/KanaCourseBuilder', () => ({
  KanaCourseBuilder: () => <div>kana-course-builder</div>,
}));
vi.mock('@/components/MaterialsBuilder/DeckPanel', () => ({
  DeckPanel: () => <div>deck-panel</div>,
}));
vi.mock('@/components/MaterialsBuilder/QuizletImport', () => ({
  QuizletImport: () => <div>quizlet-import</div>,
}));

import { MaterialsBuilder } from '@/components/MaterialsBuilder';

describe('MaterialsBuilder', () => {
  it('renders the LessonLibrary when initialTab is "assigned"', () => {
    renderWithProviders(<MaterialsBuilder initialTab="assigned" />);
    expect(screen.getByText('lesson-library-g1')).toBeInTheDocument();
  });

  it('defaults to the lesson set tab when no initialTab is given', () => {
    renderWithProviders(<MaterialsBuilder />);
    expect(screen.getByText('lesson-set-builder')).toBeInTheDocument();
  });

  it('shows "Assigned" as the first tab', () => {
    renderWithProviders(<MaterialsBuilder initialTab="assigned" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveTextContent('Assigned');
  });
});
