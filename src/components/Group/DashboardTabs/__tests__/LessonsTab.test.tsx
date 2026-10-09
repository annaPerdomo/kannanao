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

import { LessonsTab } from '../LessonsTab';

function looseWeek(overrides: Partial<ReturnType<typeof baseWeek>> = {}) {
  return { ...baseWeek(), ...overrides };
}

function baseWeek() {
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
    kanaSets: [] as string[],
    handedOut: true,
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

function baseProps(overrides: Partial<Parameters<typeof LessonsTab>[0]> = {}) {
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

describe('LessonsTab', () => {
  it('renders the Lesson Library when there is something planned', () => {
    renderWithProviders(
      <LessonsTab
        {...baseProps({ library: makeLibrary({ library: { units: [], loose: [looseWeek()] } }) })}
      />,
    );
    expect(screen.getByText('Other handouts')).toBeInTheDocument();
  });

  it('shows the Kana goals section only when a deck-less assignment exists', () => {
    const { rerender } = renderWithProviders(<LessonsTab {...baseProps({ assignments: [] })} />);
    expect(screen.queryByText('Kana goals')).not.toBeInTheDocument();

    rerender(<LessonsTab {...baseProps({ assignments: [assignment()] })} />);
    expect(screen.getByText('Kana goals')).toBeInTheDocument();
  });

  it('hides a kana goal already covered by a lesson week', () => {
    renderWithProviders(
      <LessonsTab
        {...baseProps({
          assignments: [assignment({ kana_set: 'hira-a' })],
          library: makeLibrary({
            library: { units: [], loose: [looseWeek({ kanaSets: ['hira-a'] })] },
          }),
        })}
      />,
    );
    expect(screen.queryByText('Kana goals')).not.toBeInTheDocument();
  });

  it('shows an error instead of Kana goals when assignments failed to load', () => {
    renderWithProviders(
      <LessonsTab {...baseProps({ assignmentsError: 'Could not load assignments.' })} />,
    );
    expect(screen.getByText('Kana goals')).toBeInTheDocument();
    expect(screen.getByText('Could not load assignments.')).toBeInTheDocument();
  });

  it('does not show the empty state while assignments are loading', () => {
    renderWithProviders(<LessonsTab {...baseProps({ assignmentsLoading: true })} />);
    expect(screen.queryByText('No lessons yet — make your first one.')).not.toBeInTheDocument();
  });

  it('empty state opens the new lesson flow', () => {
    const onBuild = vi.fn();
    renderWithProviders(<LessonsTab {...baseProps({ onBuild })} />);
    fireEvent.click(screen.getByText('New lesson'));
    expect(onBuild).toHaveBeenCalled();
  });

  it('"More ways to add" routes to the AI planner, Quizlet and kana course, and calls onAssign for a deck', () => {
    const onAssign = vi.fn();
    renderWithProviders(
      <LessonsTab
        {...baseProps({
          library: makeLibrary({ library: { units: [], loose: [looseWeek()] } }),
          onAssign,
        })}
      />,
    );

    fireEvent.click(screen.getByText('More ways to add'));
    fireEvent.click(screen.getByText('Plan several lessons with AI'));
    expect(mockPush).toHaveBeenCalledWith('/group/g1/add/lesson');

    fireEvent.click(screen.getByText('More ways to add'));
    fireEvent.click(screen.getByText('Hand out a deck I made'));
    expect(onAssign).toHaveBeenCalled();

    fireEvent.click(screen.getByText('More ways to add'));
    fireEvent.click(screen.getByText('Import from Quizlet'));
    expect(mockPush).toHaveBeenCalledWith('/group/g1/add/quizlet');

    fireEvent.click(screen.getByText('More ways to add'));
    fireEvent.click(screen.getByText('Kana course'));
    expect(mockPush).toHaveBeenCalledWith('/group/g1/add/kana');
  });

  it('calls onChanged after a successful Lesson Library mutation', async () => {
    const onChanged = vi.fn();
    const renameUnit = vi.fn().mockResolvedValue(true);
    renderWithProviders(
      <LessonsTab
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
