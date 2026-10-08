import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Assignment } from '@/hooks/useAssignments';
import type { LessonLibraryHook } from '@/hooks/useLessonLibrary';
import { renderWithProviders } from '@/test/renderWithProviders';

const mockUseLessonLibrary = vi.fn();
vi.mock('@/hooks/useLessonLibrary', () => ({
  useLessonLibrary: (...args: unknown[]) => mockUseLessonLibrary(...args),
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({ groups: [{ id: 'g1', name: 'Tuesday Club' }] }),
}));

vi.mock('@/hooks/useDecks', () => ({
  useDecks: () => ({ decks: [] }),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/components/Group/QuizScoresPanel', () => ({
  QuizScoresPanel: () => <div>quiz-scores-panel</div>,
}));

import { PlanTab } from '../PlanTab';

function looseWeek() {
  return {
    deckId: 'd1',
    deckName: 'Food',
    deckEmoji: '🍜',
    week: null,
    title: null,
    note: null,
    dueDate: null,
    availableOn: null,
    requiredAccuracy: null,
    requiredMode: null,
    learnerCount: 0,
    finishedCount: 0,
    wordCount: 0,
    status: 'current' as const,
  };
}

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1',
    organizer_id: 'org1',
    member_id: 'm1',
    deck_id: null,
    kana_set: 'hira-a',
    title: null,
    note: null,
    due_date: null,
    available_on: null,
    completed_at: null,
    created_at: '2026-09-01T00:00:00Z',
    required_accuracy: null,
    required_mode: null,
    progress_accuracy: null,
    ...overrides,
  } as Assignment;
}

function makeLibrary(overrides: Partial<LessonLibraryHook> = {}): LessonLibraryHook {
  return {
    library: { units: [], loose: [] },
    loading: false,
    error: null,
    saving: false,
    refetch: vi.fn(),
    editWeek: vi.fn(),
    removeWeek: vi.fn(),
    renameUnit: vi.fn(),
    shiftFrom: vi.fn(),
    addWeek: vi.fn(),
    copyUnit: vi.fn(),
    ...overrides,
  };
}

function baseProps(overrides: Partial<Parameters<typeof PlanTab>[0]> = {}) {
  return {
    groupId: 'g1',
    library: makeLibrary(),
    assignments: [],
    assignmentsLoading: false,
    assignmentsError: null,
    onEditAssignments: vi.fn(),
    onDeleteAssignments: vi.fn(),
    canAssign: true,
    onAssign: vi.fn(),
    ownDecks: [],
    onSendEncouragement: vi.fn(),
    members: [],
    onAssignMissing: vi.fn(),
    onBuild: vi.fn(),
    onChanged: vi.fn(),
    ...overrides,
  };
}

describe('PlanTab', () => {
  it('renders the Lesson Library when there is something planned', () => {
    renderWithProviders(
      <PlanTab
        {...baseProps({ library: makeLibrary({ library: { units: [], loose: [looseWeek()] } }) })}
      />,
    );
    expect(screen.getByText('Other handouts')).toBeInTheDocument();
  });

  it('shows the Kana goals section only when a deck-less assignment exists', () => {
    const { rerender } = renderWithProviders(<PlanTab {...baseProps({ assignments: [] })} />);
    expect(screen.queryByText('Kana goals')).not.toBeInTheDocument();

    rerender(<PlanTab {...baseProps({ assignments: [assignment()] })} />);
    expect(screen.getByText('Kana goals')).toBeInTheDocument();
  });

  it('shows an error instead of Kana goals when assignments failed to load', () => {
    renderWithProviders(
      <PlanTab {...baseProps({ assignmentsError: 'Could not load assignments.' })} />,
    );
    expect(screen.getByText('Kana goals')).toBeInTheDocument();
    expect(screen.getByText('Could not load assignments.')).toBeInTheDocument();
  });

  it('does not show the empty state while assignments are loading', () => {
    renderWithProviders(<PlanTab {...baseProps({ assignmentsLoading: true })} />);
    expect(
      screen.queryByText('Nothing planned yet — add your first week.'),
    ).not.toBeInTheDocument();
  });

  it('calls onAssign when "Hand out a deck" is clicked', () => {
    const onAssign = vi.fn();
    renderWithProviders(
      <PlanTab
        {...baseProps({
          library: makeLibrary({ library: { units: [], loose: [looseWeek()] } }),
          onAssign,
        })}
      />,
    );
    fireEvent.click(screen.getByText('Hand out a deck'));
    expect(onAssign).toHaveBeenCalled();
  });

  it('calls onChanged after a successful Lesson Library mutation', async () => {
    const onChanged = vi.fn();
    const renameUnit = vi.fn().mockResolvedValue(true);
    renderWithProviders(
      <PlanTab
        {...baseProps({
          library: makeLibrary({
            library: {
              units: [
                {
                  id: 'u1',
                  title: 'Unit 1',
                  level: null,
                  createdAt: '2026-01-01',
                  weeks: [{ ...looseWeek(), week: 1 }],
                },
              ],
              loose: [],
            },
            renameUnit,
          }),
          onChanged,
        })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Options for Unit 1' }));
    fireEvent.click(screen.getByText('Rename'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New title' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await vi.waitFor(() => expect(renameUnit).toHaveBeenCalledWith('u1', 'New title'));
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled());
  });
});
