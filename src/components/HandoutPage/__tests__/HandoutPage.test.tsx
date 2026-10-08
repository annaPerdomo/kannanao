import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonLibrary } from '@/types/lessonUnit';

import { card, learner, week } from './fixtures';

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
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('shows the week in its unit, with neighbours and a way back', () => {
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Animals');
    expect(screen.getByText('Spring unit · Week 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Learners will be able to: Name ten animals')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Week 1' })).toHaveAttribute(
      'href',
      '/group/g1/handout/d1',
    );
    expect(screen.getByRole('link', { name: 'Week 3' })).toHaveAttribute(
      'href',
      '/group/g1/handout/d3',
    );
    expect(screen.getByRole('link', { name: 'Back to plan · Tuesday Club' })).toHaveAttribute(
      'href',
      '/group/g1?tab=plan',
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

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Zoo trip' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(editWeek).toHaveBeenCalledWith('d2', expect.objectContaining({ title: 'Zoo trip' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('returns to the plan after removing the week', async () => {
    setLibrary(libraryWithUnit());
    renderWithProviders(<HandoutPage groupId="g1" deckId="d2" />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove this week' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith('/group/g1?tab=plan'));
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
