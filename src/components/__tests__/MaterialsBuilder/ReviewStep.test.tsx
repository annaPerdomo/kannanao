import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Group } from '@/hooks/useGroups';
import { renderWithProviders } from '@/test/renderWithProviders';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const buildLessonPlanMock = vi.fn();
const applyLessonPlanMock = vi.fn();
const uploadLessonDocumentMock = vi.fn();
const fetchImageMock = vi.fn();

vi.mock('@/services/api', () => ({
  buildLessonPlan: (...args: unknown[]) => buildLessonPlanMock(...args),
  applyLessonPlan: (...args: unknown[]) => applyLessonPlanMock(...args),
  uploadLessonDocument: (...args: unknown[]) => uploadLessonDocumentMock(...args),
  fetchImage: (...args: unknown[]) => fetchImageMock(...args),
  encodeUnsplashUrl: (r: { url: string }) => r.url,
  decodeUnsplashAttribution: vi.fn(() => null),
  triggerUnsplashDownload: vi.fn(),
  uploadImage: vi.fn(),
  isStorageImage: vi.fn(() => false),
  deleteStorageImage: vi.fn(),
}));

vi.mock('@/components/Loading', () => ({ Loading: () => <div>loading</div> }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { LessonSetBuilder } from '@/components/MaterialsBuilder/LessonSetBuilder';

const GROUP = {
  id: 'g1',
  organizer_id: 'org1',
  name: 'Japanese 1',
  emoji: null,
  pinned: false,
  show_leaderboard: true,
  created_at: '2026-01-01',
  memberCount: 1,
  activeCount: 0,
  cardsStudied: 0,
  weeklyXp: 0,
  faces: [],
} satisfies Group;

const PLAN = {
  decks: [
    {
      name: 'Food words',
      description: 'Ordering at a restaurant',
      emoji: '🍜',
      mainViewMode: 'hiragana' as const,
      cards: [
        {
          word: 'ラーメン',
          reading: 'ラーメン',
          meaning: 'ramen',
          exampleJp: 'ラーメンをたべます',
          exampleEn: 'I eat ramen',
          jlptLevel: 'N5',
        },
      ],
    },
  ],
};

const TWO_WEEK_PLAN = {
  decks: [
    {
      ...PLAN.decks[0],
      cards: [
        PLAN.decks[0].cards[0],
        {
          word: 'うどん',
          reading: 'うどん',
          meaning: 'udon',
          exampleJp: 'うどんがすきです',
          exampleEn: 'I like udon',
          jlptLevel: 'N5',
        },
      ],
    },
    {
      name: 'Snacks',
      description: 'Snack words',
      emoji: '🍡',
      mainViewMode: 'hiragana' as const,
      cards: [
        {
          word: 'おかし',
          reading: 'おかし',
          meaning: 'sweets',
          exampleJp: 'おかしをかいます',
          exampleEn: 'I buy sweets',
          jlptLevel: 'N5',
        },
      ],
    },
  ],
};

const READINESS = {
  members: [
    { id: 'm1', name: 'Ken', started: true },
    { id: 'm2', name: 'Sam', started: false },
  ],
  shakyBy: { ラ: [0] },
};

function setup() {
  renderWithProviders(<LessonSetBuilder groups={[GROUP]} groupId="g1" onGroupChange={vi.fn()} />);
}

function typeGoal() {
  fireEvent.change(screen.getByLabelText(/what do you want to cover/i), {
    target: { value: 'Food words' },
  });
}

async function reachReviewStep() {
  setup();
  typeGoal();
  fireEvent.click(screen.getByRole('button', { name: /build the plan/i }));
  await screen.findByDisplayValue('Food words');
}

async function reachTwoWeekReview() {
  buildLessonPlanMock.mockResolvedValue({ plan: TWO_WEEK_PLAN });
  await reachReviewStep();
  await screen.findByDisplayValue('Snacks');
}

beforeEach(() => {
  vi.clearAllMocks();
  buildLessonPlanMock.mockResolvedValue({ plan: PLAN });
  applyLessonPlanMock.mockResolvedValue({ results: [{ name: 'Food words', status: 'created' }] });
  let uploads = 0;
  uploadLessonDocumentMock.mockImplementation(() =>
    Promise.resolve(`org1/upload-${(uploads += 1)}.txt`),
  );
});

describe('LessonSetBuilder review step', () => {
  it('lists the plan decks and cards after a plan comes back', async () => {
    await reachReviewStep();

    expect(buildLessonPlanMock).toHaveBeenCalledWith(
      expect.objectContaining({ goal: 'Food words' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    expect(screen.getByLabelText('Word')).toHaveValue('ラーメン');
    expect(screen.getByText('ラーメンをたべます')).toBeInTheDocument();
  });

  it('applies the edited plan for the whole group — no member in the payload', async () => {
    await reachReviewStep();

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'うどん' } });
    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));

    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());

    const payload = applyLessonPlanMock.mock.calls[0][0];
    expect(payload.plan.decks[0].cards[0].word).toBe('うどん');
    expect(payload.memberId).toBeUndefined();
    expect(payload).toMatchObject({ groupId: 'g1', level: 'N5', withSentences: true });
    expect(typeof payload.firstDueDate).toBe('string');
  });

  it('unticking a card leaves it out of the apply payload and the counts', async () => {
    await reachTwoWeekReview();

    expect(screen.getByText(/2 decks, 3 cards/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Approve うどん' }));
    expect(screen.getByText(/2 decks, 2 cards/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());

    const payload = applyLessonPlanMock.mock.calls[0][0];
    expect(payload.plan.decks[0].cards.map((c: { word: string }) => c.word)).toEqual(['ラーメン']);
    expect(payload.plan.decks[0].cards[0].excluded).toBeUndefined();
  });

  it('shows the skipped note under an unticked card', async () => {
    await reachTwoWeekReview();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Approve うどん' }));

    expect(
      screen.getByText("Not approved — won't be created unless you regenerate"),
    ).toBeInTheDocument();
  });

  it('switching a week off drops its whole deck from the apply payload', async () => {
    await reachTwoWeekReview();

    fireEvent.click(screen.getByRole('switch', { name: 'Approve all of Snacks' }));
    expect(screen.getByText(/1 deck, 2 cards/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());

    const payload = applyLessonPlanMock.mock.calls[0][0];
    expect(payload.plan.decks).toHaveLength(1);
    expect(payload.plan.decks[0].name).toBe('Food words');
  });

  it('disables creating when everything is switched off', async () => {
    await reachTwoWeekReview();

    fireEvent.click(screen.getByRole('switch', { name: 'Approve all of Food words' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Approve all of Snacks' }));

    expect(screen.getByRole('button', { name: /create decks & assign/i })).toBeDisabled();
  });

  it('a card added in review reaches the payload; one left blank is dropped', async () => {
    await reachReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /add a card/i }));
    const wordFields = screen.getAllByLabelText('Word');
    fireEvent.change(wordFields[wordFields.length - 1], { target: { value: 'たまご' } });
    fireEvent.click(screen.getByRole('button', { name: /add a card/i }));

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());

    const payload = applyLessonPlanMock.mock.calls[0][0];
    expect(payload.plan.decks[0].cards.map((c: { word: string }) => c.word)).toEqual([
      'ラーメン',
      'たまご',
    ]);
  });

  it('locks the ticks after a failed apply so a retry matches what was created', async () => {
    applyLessonPlanMock.mockRejectedValueOnce(new Error('network died'));
    await reachTwoWeekReview();

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await screen.findByText('network died');

    expect(screen.getByRole('switch', { name: 'Approve all of Snacks' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Approve うどん' })).toBeDisabled();
    expect(screen.getByText(/ticks are locked/i)).toBeInTheDocument();
  });

  it('opens a print window for the study sheets', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    await reachReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /print study sheets/i }));

    expect(openSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('sends the selected group id when building the plan', async () => {
    await reachReviewStep();

    expect(buildLessonPlanMock.mock.calls[0][0]).toMatchObject({ groupId: 'g1' });
  });

  it('shows the warm-up review panel with each known word and its deck', async () => {
    buildLessonPlanMock.mockResolvedValueOnce({
      plan: PLAN,
      warmUp: [{ word: '会う', reading: 'あう', meaning: 'to meet', deckName: 'Verbs' }],
    });
    await reachReviewStep();

    expect(screen.getByText('Warm-up review')).toBeInTheDocument();
    expect(screen.getByText(/会う（あう）/)).toBeInTheDocument();
    expect(screen.getByText('from Verbs')).toBeInTheDocument();
  });

  it('hides the warm-up panel when the plan has no known words', async () => {
    await reachReviewStep();

    expect(screen.queryByText('Warm-up review')).not.toBeInTheDocument();
  });

  it('per-deck retry sends the group id and merges new warm-up entries with the existing ones', async () => {
    buildLessonPlanMock.mockResolvedValueOnce({
      plan: PLAN,
      warmUp: [{ word: '会う', reading: 'あう', meaning: 'to meet', deckName: 'Verbs' }],
    });
    await reachReviewStep();

    buildLessonPlanMock.mockResolvedValueOnce({
      plan: PLAN,
      warmUp: [{ word: '飲む', reading: 'のむ', meaning: 'to drink', deckName: 'Verbs' }],
    });
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(buildLessonPlanMock).toHaveBeenCalledTimes(2));
    expect(buildLessonPlanMock.mock.calls[1][0]).toMatchObject({ groupId: 'g1' });

    expect(await screen.findByText(/飲む（のむ）/)).toBeInTheDocument();
    expect(screen.getByText(/会う（あう）/)).toBeInTheDocument();
  });

  it('clamps the retry card count when the known-word filter shrank the deck below the minimum', async () => {
    buildLessonPlanMock.mockResolvedValueOnce({
      plan: PLAN,
      warmUp: [{ word: '会う', reading: 'あう', meaning: 'to meet', deckName: 'Verbs' }],
    });
    await reachReviewStep();

    buildLessonPlanMock.mockResolvedValueOnce({ plan: PLAN });
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(buildLessonPlanMock).toHaveBeenCalledTimes(2));
    expect(buildLessonPlanMock.mock.calls[1][0]).toMatchObject({ cardsPerDeck: 5 });
  });

  it('keeps the warm-up list out of the apply payload — same plan and no warmUp key', async () => {
    buildLessonPlanMock.mockResolvedValueOnce({
      plan: PLAN,
      warmUp: [{ word: '会う', reading: 'あう', meaning: 'to meet', deckName: 'Verbs' }],
    });
    await reachReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());

    const payload = applyLessonPlanMock.mock.calls[0][0];
    expect(payload).not.toHaveProperty('warmUp');
    expect(payload.plan).toEqual(PLAN);
  });

  it('renders furigana markup in the example sentence as ruby text', async () => {
    buildLessonPlanMock.mockResolvedValueOnce({
      plan: {
        decks: [
          {
            ...PLAN.decks[0],
            cards: [{ ...PLAN.decks[0].cards[0], exampleJp: '{犬|いぬ}がいます' }],
          },
        ],
      },
    });
    await reachReviewStep();

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    expect(screen.getByText('犬').closest('ruby')).toHaveTextContent('いぬ');
  });

  it('refreshes a card picture and carries the new imageUrl into the apply payload', async () => {
    fetchImageMock.mockResolvedValueOnce({
      url: 'https://images.unsplash.com/new',
      downloadLocation: 'https://api.unsplash.com/photos/x/download',
      photographerName: 'Jane',
      photographerUrl: 'https://unsplash.com/@jane',
      photoPageUrl: 'https://unsplash.com/photos/x',
    });
    await reachReviewStep();

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    fireEvent.click(screen.getByLabelText('Find a new picture'));

    await waitFor(() => expect(fetchImageMock).toHaveBeenCalledWith('ramen'));

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());

    const payload = applyLessonPlanMock.mock.calls[0][0];
    expect(payload.plan.decks[0].cards[0].imageUrl).toBe('https://images.unsplash.com/new');
  });

  it('mounts a newly added card expanded', async () => {
    await reachReviewStep();

    const expandButtons = () =>
      screen.getAllByRole('button', { name: /show details|hide details/i });
    expect(expandButtons().every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /add a card/i }));

    const buttons = expandButtons();
    expect(buttons[buttons.length - 1]).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('LessonSetBuilder kana support', () => {
  async function reachReviewWithKanaGaps() {
    buildLessonPlanMock.mockResolvedValue({ plan: PLAN, kanaReadiness: READINESS });
    await reachReviewStep();
  }

  it('flags the sounds the group has not mastered, and no others', async () => {
    await reachReviewWithKanaGaps();

    expect(screen.getByText('New sounds: ラ')).toBeInTheDocument();
  });

  it('says nothing per card when the group has never used Learn Kana', async () => {
    buildLessonPlanMock.mockResolvedValue({
      plan: PLAN,
      kanaReadiness: { members: [{ id: 'm2', name: 'Sam', started: false }], shakyBy: {} },
    });
    await reachReviewStep();

    expect(screen.queryByText(/New sounds/)).not.toBeInTheDocument();
    expect(screen.getByText(/hasn't tried Learn Kana yet/i)).toBeInTheDocument();
  });

  it('assigns the matching kana row alongside the decks, ahead of its own week', async () => {
    await reachReviewWithKanaGaps();

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));

    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());
    const rows = applyLessonPlanMock.mock.calls[0][0].kanaWeeks;
    // "Katakana not yet" is the N5 default, so every katakana row the words use.
    expect(rows.map((r: { setId: string }) => r.setId)).toContain('kata-ra');
    // Three days before the week it supports, never the same day.
    expect(rows[0].dueDate < applyLessonPlanMock.mock.calls[0][0].firstDueDate).toBe(true);
  });

  it("lets the organizer switch off a week's sounds", async () => {
    await reachReviewWithKanaGaps();

    fireEvent.click(screen.getByRole('switch', { name: /hand out the sounds due/i }));
    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));

    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());
    expect(applyLessonPlanMock.mock.calls[0][0].kanaWeeks).toEqual([]);
  });

  it('asks whether the group reads each script, and sends the answer', async () => {
    setup();
    typeGoal();
    fireEvent.click(screen.getByRole('button', { name: /build the plan/i }));

    await waitFor(() => expect(buildLessonPlanMock).toHaveBeenCalled());
    // N5 by default: hiragana alongside the words, katakana not yet.
    expect(buildLessonPlanMock.mock.calls[0][0].readingLevel).toEqual({
      hiragana: 'learning',
      katakana: 'not-yet',
    });
  });

  it('keeps the level guess when nobody in the group has started reading', async () => {
    buildLessonPlanMock.mockResolvedValue({
      plan: PLAN,
      kanaReadingStages: { hiragana: [], katakana: [] },
    });
    await reachReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());
    // An empty list is nobody having tried, not evidence the group reads.
    const rows = applyLessonPlanMock.mock.calls[0][0].kanaWeeks;
    expect(rows.length).toBeGreaterThan(0);
  });

  it('lets real reading data override the level guess', async () => {
    buildLessonPlanMock.mockResolvedValue({
      plan: PLAN,
      kanaReadingStages: { hiragana: ['reads', 'reads'], katakana: ['reads', 'reads'] },
    });
    await reachReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());
    expect(applyLessonPlanMock.mock.calls[0][0].kanaWeeks).toEqual([]);
  });
});
