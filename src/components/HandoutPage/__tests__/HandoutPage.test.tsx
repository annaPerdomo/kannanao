import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonLibrary } from '@/types/lessonUnit';

import { card, draftWeek, learner, week } from './fixtures';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isMemberAccount: false, loading: false, user: { id: 'org1' } }),
}));
vi.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({ groups: [{ id: 'g1', name: 'Tuesday Club' }] }),
}));

const mockLibrary = vi.fn();
const editWeek = vi.fn();
const removeWeek = vi.fn();
vi.mock('@/hooks/useLessonLibrary', () => ({
  useLessonLibrary: () => mockLibrary(),
  LESSON_LIBRARY_CACHE_PREFIX: '/api/group/lessons',
}));
const wordsRefetch = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useHandoutWords', () => ({
  useHandoutWords: () => ({
    data: {
      deck: { id: 'd2', name: 'Animals', emoji: null },
      learnerCount: 1,
      words: [{ card: card('c1', '猫'), seenCount: 1, strongCount: 1, trickyCount: 0 }],
      learner: null,
      learners: [
        learner({ id: 'm1', name: 'Hana' }),
        learner({ id: 'm2', name: 'Taro', assigned: false }),
      ],
    },
    loading: false,
    error: null,
    refetch: wordsRefetch,
    mutate: vi.fn(),
  }),
}));
const createAssignment = vi.fn().mockResolvedValue({});
vi.mock('@/hooks/useAssignments', () => ({
  useAssignments: () => ({ createAssignment }),
}));
vi.mock('@/components/HandoutPage/AddWordsFlow', () => ({ AddWordsFlow: () => null }));
vi.mock('@/components/Group/HandoutDetailDialog/LearnerWordList', () => ({
  LearnerWordList: ({ memberName }: { memberName: string }) => <p>learner view {memberName}</p>,
}));
vi.mock('@/components/HandoutPage/SoundsSection', () => ({ SoundsSection: () => null }));
const renameDeck = vi.fn().mockResolvedValue({});
vi.mock('@/lib/supabase', () => ({ dbRenameDeck: (...args: unknown[]) => renameDeck(...args) }));
vi.mock('@/lib/apiCache', () => ({ invalidateApiCache: vi.fn() }));
const handOutDone = vi.fn();
vi.mock('@/components/HandoutPage/HandOutDialog', () => ({
  HandOutDialog: ({ open, onDone }: { open: boolean; onDone: (r: unknown) => void }) =>
    open ? (
      <button
        onClick={() => {
          const result = handOutDone();
          onDone(result);
        }}
      >
        Confirm hand out
      </button>
    ) : null,
}));

import { HandoutPage } from '@/components/HandoutPage';

function libraryWithUnit(): LessonLibrary {
  return {
    units: [
      {
        id: 'u1',
        title: 'Spring unit',
        level: null,
        createdAt: '2026-09-01T00:00:00Z',
        weeks: [
          week({ deckId: 'd1', deckName: 'Food', week: 1 }),
          week({ deckId: 'd2', deckName: 'Animals', week: 2, note: 'Name ten animals' }),
          week({ deckId: 'd3', deckName: 'Travel', week: 3 }),
        ],
      },
    ],
    loose: [],
  };
}

function setLibrary(library: LessonLibrary | null, extra: Record<string, unknown> = {}) {
  mockLibrary.mockReturnValue({
    library,
    loading: false,
    error: null,
    saving: false,
    refetch: vi.fn(),
    editWeek,
    removeWeek,
    shiftFrom: vi.fn(),
    ...extra,
  });
}

describe('HandoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editWeek.mockResolvedValue(true);
    removeWeek.mockResolvedValue(true);
    handOutDone.mockReturnValue({ assigned: 1, kanaAssigned: [], kanaFailed: [] });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('shows the draft banner and hides learners and settings for a draft week', () => {
    const library = libraryWithUnit();
    library.units[0].weeks[1] = draftWeek({ deckId: 'd2', deckName: 'Animals', week: 2 });
    setLibrary(library);
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    expect(screen.getByText('This lesson is a draft')).toBeInTheDocument();
    expect(screen.queryByText('Learners (2)')).not.toBeInTheDocument();
    expect(screen.queryByText('Schedule & goal')).not.toBeInTheDocument();
  });

  it('hides the draft banner for a handed-out week', () => {
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);
    expect(screen.queryByText('This lesson is a draft')).not.toBeInTheDocument();
  });

  it('deletes a draft and returns to lessons', async () => {
    const library = libraryWithUnit();
    library.units[0].weeks[1] = draftWeek({ deckId: 'd2', deckName: 'Animals', week: 2 });
    setLibrary(library);
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith('/group/g1?tab=lessons'));
    expect(removeWeek).toHaveBeenCalledWith('d2');
  });

  it('shows a warning toast when practice sentences failed to generate', async () => {
    const library = libraryWithUnit();
    library.units[0].weeks[1] = draftWeek({ deckId: 'd2', deckName: 'Animals', week: 2 });
    setLibrary(library);
    handOutDone.mockReturnValue({
      assigned: 1,
      kanaAssigned: [],
      kanaFailed: [],
      sentences: 'failed',
    });
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByRole('button', { name: 'Hand out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm hand out' }));

    expect(
      await screen.findByText(
        "Handed out, but practice sentences couldn't be added. You can add them from the deck page.",
      ),
    ).toBeInTheDocument();
  });

  it('hands out a draft lesson and shows a confirmation toast', async () => {
    const library = libraryWithUnit();
    library.units[0].weeks[1] = draftWeek({ deckId: 'd2', deckName: 'Animals', week: 2 });
    const refetch = vi.fn();
    setLibrary(library, { refetch });
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByRole('button', { name: 'Hand out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm hand out' }));

    expect(
      await screen.findByText('Handed out! Learners will see it in Practice.'),
    ).toBeInTheDocument();
    await vi.waitFor(() => expect(refetch).toHaveBeenCalled());
    await vi.waitFor(() => expect(wordsRefetch).toHaveBeenCalled());
  });

  it('shows the week in its unit, with neighbours and a way back', () => {
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Animals');
    expect(screen.getByText('Spring unit · Week 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('By the end: Name ten animals')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Week 1' })).toHaveAttribute(
      'href',
      '/group/g1/handout/d1',
    );
    expect(screen.getByRole('link', { name: 'Week 3' })).toHaveAttribute(
      'href',
      '/group/g1/handout/d3',
    );
    expect(screen.getByRole('link', { name: 'Back to lessons · Tuesday Club' })).toHaveAttribute(
      'href',
      '/group/g1?tab=lessons',
    );
    expect(screen.getByText('猫')).toBeInTheDocument();
  });

  it('says the handout is gone when it is not in this group', () => {
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="missing" />);
    expect(screen.getByText(/isn't handed out to this group anymore/)).toBeInTheDocument();
  });

  it('switches the word list to one learner and back', () => {
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByText('Hana'));
    expect(screen.getByText('learner view Hana')).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.queryByText('猫')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Hana'));
    expect(screen.getByText('猫')).toBeInTheDocument();
  });

  it('assigns an unassigned learner to the handout', async () => {
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByRole('button', { name: 'Hand out' }));

    await vi.waitFor(() =>
      expect(createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ memberIds: ['m2'], deckId: 'd2' }),
      ),
    );
    expect(await screen.findByText('Handed out to Taro')).toBeInTheDocument();
    // Without this, a stale cache hit on return shows the learner as
    // unassigned again and invites a duplicate assignment.
    await vi.waitFor(() => expect(wordsRefetch).toHaveBeenCalled());
  });

  it('shows an error toast when assigning a learner fails', async () => {
    createAssignment.mockRejectedValueOnce(new Error('network error'));
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByRole('button', { name: 'Hand out' }));

    expect(
      await screen.findByText("Couldn't hand this out to them. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hand out' })).not.toBeDisabled();
  });

  it('saves settings with a confirmation toast', async () => {
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.change(screen.getByLabelText('What learners will be able to do'), {
      target: { value: 'Name twelve animals' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(editWeek).toHaveBeenCalledWith(
      'd2',
      expect.objectContaining({ note: 'Name twelve animals' }),
    );
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('renames a handed-out lesson from the header and keeps the handout title in step', async () => {
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByRole('button', { name: 'Rename lesson' }));
    fireEvent.change(screen.getByLabelText('Lesson name'), { target: { value: 'Zoo trip' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    await vi.waitFor(() => expect(renameDeck).toHaveBeenCalledWith('d2', 'Zoo trip'));
    expect(editWeek).toHaveBeenCalledWith('d2', { title: 'Zoo trip' });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('renames a draft without touching handout rows', async () => {
    const library = libraryWithUnit();
    library.units[0].weeks[1] = draftWeek({ deckId: 'd2', deckName: 'Animals', week: 2 });
    const refetch = vi.fn().mockResolvedValue(undefined);
    setLibrary(library, { refetch });
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByRole('button', { name: 'Rename lesson' }));
    fireEvent.change(screen.getByLabelText('Lesson name'), {
      target: { value: 'Farm animals' },
    });
    fireEvent.keyDown(screen.getByLabelText('Lesson name'), { key: 'Enter' });

    await vi.waitFor(() => expect(renameDeck).toHaveBeenCalledWith('d2', 'Farm animals'));
    expect(editWeek).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it('keeps the deck name and says so when the handout title fails to sync', async () => {
    editWeek.mockResolvedValue(false);
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByRole('button', { name: 'Rename lesson' }));
    fireEvent.change(screen.getByLabelText('Lesson name'), { target: { value: 'Zoo trip' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    await vi.waitFor(() => expect(editWeek).toHaveBeenCalledWith('d2', { title: 'Zoo trip' }));
    expect(renameDeck).not.toHaveBeenCalled();
    expect(await screen.findByText("Couldn't save. Try again.")).toBeInTheDocument();
    expect(screen.getByLabelText('Lesson name')).toBeInTheDocument();
  });

  it('shows a custom handout title and syncs it when saving the same deck name', async () => {
    const library = libraryWithUnit();
    library.units[0].weeks[1] = week({
      deckId: 'd2',
      deckName: 'Animals',
      title: 'Zoo trip',
      week: 2,
    });
    setLibrary(library);
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    expect(screen.getByText('Zoo trip')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rename lesson' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    await vi.waitFor(() => expect(editWeek).toHaveBeenCalledWith('d2', { title: 'Animals' }));
    expect(renameDeck).not.toHaveBeenCalled();
  });

  it('moves the schedule shortcut and shift into the header', () => {
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByRole('button', { name: /Opens .* · Due .*finished/ }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Move this week and later' }));
    expect(screen.getByText(/Move week 2 and everything after it/)).toBeInTheDocument();
  });

  it('returns to the plan after removing the week', async () => {
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove this week' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith('/group/g1?tab=lessons'));
    expect(removeWeek).toHaveBeenCalledWith('d2');
  });

  it('offers a retry when the library fails to load', () => {
    const refetch = vi.fn();
    setLibrary(null, { error: "Couldn't load your lessons.", refetch });
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
