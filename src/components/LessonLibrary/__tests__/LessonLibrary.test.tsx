import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LessonLibraryHook } from '@/hooks/useLessonLibrary';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonLibrary as LessonLibraryData, LessonUnitWeek } from '@/types/lessonUnit';

const mockRefetch = vi.fn();
const mockRenameUnit = vi.fn();
const mockShiftFrom = vi.fn();
const mockAddWeek = vi.fn();
const mockCopyUnit = vi.fn();

vi.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({ groups: [{ id: 'g1', name: 'Tuesday Club' }] }),
}));

const mockUseDecks = vi.fn();
vi.mock('@/hooks/useDecks', () => ({
  useDecks: (...args: unknown[]) => mockUseDecks(...args),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { LessonLibrary } from '@/components/LessonLibrary';

function week(overrides: Partial<LessonUnitWeek> = {}): LessonUnitWeek {
  return {
    deckId: 'd1',
    deckName: 'Food',
    deckEmoji: '🍜',
    week: 1,
    title: null,
    note: null,
    dueDate: '2026-10-09',
    availableOn: '2026-10-02',
    requiredAccuracy: null,
    requiredMode: null,
    learnerCount: 0,
    finishedCount: 0,
    wordCount: 0,
    status: 'current',
    kanaSets: [],
    handedOut: true,
    ...overrides,
  };
}

function buildLibrary(
  data: LessonLibraryData | null,
  overrides: Partial<LessonLibraryHook> = {},
): LessonLibraryHook {
  return {
    library: data,
    loading: false,
    error: null,
    saving: false,
    refetch: mockRefetch,
    editWeek: vi.fn(),
    removeWeek: vi.fn(),
    renameUnit: mockRenameUnit,
    shiftFrom: mockShiftFrom,
    addWeek: mockAddWeek,
    copyUnit: mockCopyUnit,
    ...overrides,
  };
}

function renderLibrary(
  data: LessonLibraryData | null,
  overrides: Partial<LessonLibraryHook> = {},
  props: Partial<{ onBuild: () => void; onSwitchGroup: (id: string) => void }> = {},
) {
  return renderWithProviders(
    <LessonLibrary
      groupId="g1"
      onBuild={props.onBuild ?? vi.fn()}
      onSwitchGroup={props.onSwitchGroup}
      library={buildLibrary(data, overrides)}
    />,
  );
}

describe('LessonLibrary', () => {
  beforeEach(() => {
    mockRefetch.mockReset();
    mockPush.mockReset();
    mockRenameUnit.mockReset().mockResolvedValue(true);
    mockShiftFrom.mockReset().mockResolvedValue(true);
    mockAddWeek.mockReset().mockResolvedValue('ok');
    mockCopyUnit.mockReset().mockResolvedValue({ status: 'ok' });
    mockUseDecks.mockReset().mockReturnValue({ decks: [], loading: false, error: null });
  });

  it('shows the loading state', () => {
    renderLibrary(null, { loading: true });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the error state and calls refetch on retry', () => {
    renderLibrary(null, { error: "Couldn't load your lessons. Try again in a moment." });
    expect(screen.getByText(/couldn't load your lessons/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows the empty state and calls onBuild', () => {
    const onBuild = vi.fn();
    renderLibrary({ units: [], loose: [] }, {}, { onBuild });
    expect(screen.getByText('Nothing handed out to this group yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /new lesson/i }));
    expect(onBuild).toHaveBeenCalled();
  });

  it('expands only the unit containing the current week, and opens the handout page on Enter', () => {
    renderLibrary({
      units: [
        {
          id: 'u-new',
          title: 'Unit 2',
          level: null,
          createdAt: '2026-09-15T00:00:00Z',
          weeks: [week({ deckId: 'd2', deckName: 'Animals', week: 1, status: 'current' })],
        },
        {
          id: 'u-old',
          title: 'Unit 1',
          level: null,
          createdAt: '2026-01-01T00:00:00Z',
          weeks: [week({ deckId: 'd1', deckName: 'Food', week: 1, status: 'past' })],
        },
      ],
      loose: [],
    });

    expect(screen.getByRole('button', { name: 'Hide weeks' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Show weeks' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    const animalsRow = screen.getByText(/Animals/).closest('[role="button"]');
    expect(animalsRow).toBeTruthy();

    fireEvent.keyDown(animalsRow as Element, { key: 'Enter' });
    expect(mockPush).toHaveBeenCalledWith('/group/g1/handout/d2');
  });

  it('shows the word count on the row, hiding it when zero', () => {
    renderLibrary({
      units: [
        {
          id: 'u1',
          title: 'Unit 1',
          level: null,
          createdAt: '2026-09-01T00:00:00Z',
          weeks: [
            week({ deckId: 'd1', deckName: 'Food', week: 1, wordCount: 12 }),
            week({ deckId: 'd2', deckName: 'Travel', week: 2, wordCount: 0 }),
          ],
        },
      ],
      loose: [],
    });
    expect(screen.getByText('12 words')).toBeInTheDocument();
  });

  it('shows "Waiting for learners to join" when a week has no learners', () => {
    renderLibrary({
      units: [
        {
          id: 'u1',
          title: 'Unit 1',
          level: null,
          createdAt: '2026-09-01T00:00:00Z',
          weeks: [week({ learnerCount: 0, status: 'current' })],
        },
      ],
      loose: [],
    });
    expect(screen.getByText('Waiting for learners to join')).toBeInTheDocument();
  });

  it('renders loose handouts under "Other handouts"', () => {
    renderLibrary({
      units: [],
      loose: [
        week({
          deckId: 'd3',
          deckName: 'Loose deck',
          week: null,
          learnerCount: 2,
          finishedCount: 1,
          wordCount: 0,
        }),
      ],
    });
    expect(screen.getByText('Other handouts')).toBeInTheDocument();
    expect(screen.getByText(/Loose deck/)).toBeInTheDocument();
    expect(screen.getByText('1/2 finished')).toBeInTheDocument();
  });

  function oneUnitLibrary(): LessonLibraryData {
    return {
      units: [
        {
          id: 'u1',
          title: 'Unit 1',
          level: null,
          createdAt: '2026-09-01T00:00:00Z',
          weeks: [week({ deckId: 'd1', deckName: 'Food', week: 1, status: 'current' })],
        },
      ],
      loose: [],
    };
  }

  it('shows the shift preview text from the overflow menu', () => {
    renderLibrary(oneUnitLibrary());

    fireEvent.click(screen.getByRole('button', { name: 'More for week 1' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move this week and later' }));

    expect(screen.getByText(/Week 1 will be due/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockShiftFrom).toHaveBeenCalledWith('u1', 'd1', 7);
  });

  it('renames the unit on Enter from the inline field', () => {
    renderLibrary(oneUnitLibrary());

    fireEvent.click(screen.getByRole('button', { name: 'Options for Unit 1' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));

    const input = screen.getByDisplayValue('Unit 1');
    fireEvent.change(input, { target: { value: 'New unit name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockRenameUnit).toHaveBeenCalledWith('u1', 'New unit name');
  });

  it('shows an error toast when renameUnit fails', async () => {
    mockRenameUnit.mockResolvedValueOnce(false);
    renderLibrary(oneUnitLibrary());

    fireEvent.click(screen.getByRole('button', { name: 'Options for Unit 1' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const input = screen.getByDisplayValue('Unit 1');
    fireEvent.change(input, { target: { value: 'New unit name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByText("Couldn't save. Try again.")).toBeInTheDocument();
  });

  it('opens loose handouts on their page, with no move-week overflow', () => {
    renderLibrary({
      units: [],
      loose: [week({ deckId: 'd3', deckName: 'Loose deck', week: null })],
    });

    expect(screen.queryByRole('button', { name: /More for week/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Loose deck/));
    expect(mockPush).toHaveBeenCalledWith('/group/g1/handout/d3');
  });

  it('shows the can-do list in week order and hides it when no week has a note', () => {
    renderLibrary({
      units: [
        {
          id: 'u1',
          title: 'Unit 1',
          level: null,
          createdAt: '2026-09-01T00:00:00Z',
          weeks: [
            week({ deckId: 'd1', week: 1, note: 'I can greet people.' }),
            week({ deckId: 'd2', week: 2, note: null }),
            week({ deckId: 'd3', week: 3, note: 'I can order food.' }),
          ],
        },
      ],
      loose: [],
    });

    expect(screen.getByText('By the end of this unit, learners can:')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem').map((el) => el.textContent);
    expect(items).toEqual(['I can greet people.', 'I can order food.']);
  });

  it('hides the can-do list when no week in the unit has a note', () => {
    renderLibrary(oneUnitLibrary());
    expect(screen.queryByText('By the end of this unit, learners can:')).not.toBeInTheDocument();
  });

  it('opens the add-week dialog, selects the review tile with the keyboard, and adds it', async () => {
    renderLibrary(oneUnitLibrary());

    fireEvent.click(screen.getByRole('button', { name: 'Add a week' }));
    const reviewTile = screen.getByText('Review week').closest('[role="button"]') as Element;
    expect(reviewTile).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(reviewTile, { key: 'Enter' });
    expect(reviewTile).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Add week' }));
    expect(mockAddWeek).toHaveBeenCalledWith('u1', { kind: 'review' });
  });

  it('shows the already-in-unit message instead of the generic save error', async () => {
    mockAddWeek.mockResolvedValue('already_in_unit');
    renderLibrary(oneUnitLibrary());

    fireEvent.click(screen.getByRole('button', { name: 'Add a week' }));
    const reviewTile = screen.getByText('Review week').closest('[role="button"]') as Element;
    fireEvent.click(reviewTile);
    fireEvent.click(screen.getByRole('button', { name: 'Add week' }));

    expect(
      await screen.findByText('That deck is already part of a unit for this group.'),
    ).toBeInTheDocument();
  });

  it('only enables the deck fetch while the add-week dialog is open', () => {
    mockUseDecks.mockReturnValue({ decks: [], loading: false, error: null });
    renderLibrary(oneUnitLibrary());

    expect(mockUseDecks).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Add a week' }));
    expect(mockUseDecks).toHaveBeenLastCalledWith(true);
  });

  it('excludes shared decks from the deck picker', () => {
    mockUseDecks.mockReturnValue({
      decks: [
        { id: 'd9', name: 'Own deck', emoji: null, isShared: false },
        { id: 'd10', name: 'Shared deck', emoji: null, isShared: true },
      ],
      loading: false,
      error: null,
    });
    renderLibrary(oneUnitLibrary());

    fireEvent.click(screen.getByRole('button', { name: 'Add a week' }));
    fireEvent.click(screen.getByText('A deck I already have'));
    fireEvent.mouseDown(screen.getByRole('combobox'));

    expect(screen.getByText(/Own deck/)).toBeInTheDocument();
    expect(screen.queryByText(/Shared deck/)).not.toBeInTheDocument();
  });

  it('disables Add week until a deck is chosen in deck mode', () => {
    mockUseDecks.mockReturnValue({
      decks: [{ id: 'd9', name: 'Spare deck', emoji: null }],
      loading: false,
      error: null,
    });
    renderLibrary(oneUnitLibrary());

    fireEvent.click(screen.getByRole('button', { name: 'Add a week' }));
    fireEvent.click(screen.getByText('A deck I already have'));

    expect(screen.getByRole('button', { name: 'Add week' })).toBeDisabled();
  });
});
