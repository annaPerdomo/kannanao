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

vi.mock('@/services/api', () => ({
  buildLessonPlan: (...args: unknown[]) => buildLessonPlanMock(...args),
  applyLessonPlan: (...args: unknown[]) => applyLessonPlanMock(...args),
  uploadLessonDocument: (...args: unknown[]) => uploadLessonDocumentMock(...args),
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

describe('LessonSetBuilder', () => {
  it('enables the build button once a goal is typed — no learner to pick', () => {
    setup();

    expect(screen.getByRole('button', { name: /build the plan/i })).toBeDisabled();
    typeGoal();
    expect(screen.getByRole('button', { name: /build the plan/i })).toBeEnabled();
  });

  it('builds at N5 with no style notes by default', async () => {
    setup();
    typeGoal();
    fireEvent.click(screen.getByRole('button', { name: /build the plan/i }));
    await waitFor(() => expect(buildLessonPlanMock).toHaveBeenCalled());

    expect(buildLessonPlanMock.mock.calls[0][0]).toMatchObject({
      level: 'N5',
      styleNotes: undefined,
    });
  });

  it('sends the chosen level and style notes when building', async () => {
    setup();
    typeGoal();

    fireEvent.mouseDown(screen.getByLabelText(/japanese level/i));
    fireEvent.click(await screen.findByText(/N2 — Upper intermediate/));

    fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
    fireEvent.change(screen.getByLabelText(/what should the example sentences be like/i), {
      target: { value: 'Business settings, polite form' },
    });

    fireEvent.click(screen.getByRole('button', { name: /build the plan/i }));
    await waitFor(() => expect(buildLessonPlanMock).toHaveBeenCalled());

    expect(buildLessonPlanMock.mock.calls[0][0]).toMatchObject({
      level: 'N2',
      styleNotes: 'Business settings, polite form',
    });
  });

  it('uploads a document and sends its storage path when building the plan', async () => {
    setup();
    typeGoal();

    const file = new File(['word,reading,meaning'], 'vocab.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText('vocab.txt');

    expect(uploadLessonDocumentMock).toHaveBeenCalledWith(file);

    fireEvent.click(screen.getByRole('button', { name: /build the plan/i }));
    await waitFor(() => expect(buildLessonPlanMock).toHaveBeenCalled());

    const payload = buildLessonPlanMock.mock.calls[0][0];
    expect(payload.documents).toEqual([{ path: 'org1/upload-1.txt', mimeType: 'text/plain' }]);
  });

  it('reports a failed upload and attaches nothing', async () => {
    uploadLessonDocumentMock.mockRejectedValueOnce(new Error('storage unreachable'));
    setup();

    const file = new File(['x'], 'vocab.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(/couldn't upload that file/i)).toBeInTheDocument();
    expect(screen.queryByText('vocab.txt')).not.toBeInTheDocument();
  });

  it('never uploads a file that fails the size check', async () => {
    setup();

    const tooBig = new File(['x'], 'huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(tooBig, 'size', { value: 11 * 1024 * 1024 });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [tooBig] } });

    expect(await screen.findByText(/under 10 MB/i)).toBeInTheDocument();
    expect(uploadLessonDocumentMock).not.toHaveBeenCalled();
  });

  it('attaches multiple documents and lets the organizer remove one before building', async () => {
    setup();
    typeGoal();

    const fileA = new File(['a'], 'vocab-a.txt', { type: 'text/plain' });
    const fileB = new File(['b'], 'vocab-b.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileA, fileB] } });
    await screen.findByText('vocab-a.txt');
    await screen.findByText('vocab-b.txt');

    fireEvent.click(screen.getAllByTestId('CancelIcon')[0]);

    fireEvent.click(screen.getByRole('button', { name: /build the plan/i }));
    await waitFor(() => expect(buildLessonPlanMock).toHaveBeenCalled());

    const payload = buildLessonPlanMock.mock.calls[0][0];
    expect(payload.documents).toHaveLength(1);
  });

  it('rejects a file type outside PDF/plain text', async () => {
    setup();
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(/plain text file/i)).toBeInTheDocument();
  });

  it('lists the plan decks and cards after a plan comes back', async () => {
    await reachReviewStep();

    expect(buildLessonPlanMock).toHaveBeenCalledWith(
      expect.objectContaining({ goal: 'Food words' }),
    );
    expect(screen.getByLabelText('Word')).toHaveValue('ラーメン');
    expect(screen.getByLabelText('Example (Japanese)')).toHaveValue('ラーメンをたべます');
  });

  it('applies the edited plan for the whole group — no member in the payload', async () => {
    await reachReviewStep();

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
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include うどん' }));
    expect(screen.getByText(/2 decks, 2 cards/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());

    const payload = applyLessonPlanMock.mock.calls[0][0];
    expect(payload.plan.decks[0].cards.map((c: { word: string }) => c.word)).toEqual(['ラーメン']);
    expect(payload.plan.decks[0].cards[0].excluded).toBeUndefined();
  });

  it('switching a week off drops its whole deck from the apply payload', async () => {
    await reachTwoWeekReview();

    fireEvent.click(screen.getByRole('switch', { name: 'Include Snacks' }));
    expect(screen.getByText(/1 deck, 2 cards/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());

    const payload = applyLessonPlanMock.mock.calls[0][0];
    expect(payload.plan.decks).toHaveLength(1);
    expect(payload.plan.decks[0].name).toBe('Food words');
  });

  it('disables creating when everything is switched off', async () => {
    await reachTwoWeekReview();

    fireEvent.click(screen.getByRole('switch', { name: 'Include Food words' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Include Snacks' }));

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

  it('folds the chosen audience into the styleNotes sent when building', async () => {
    setup();
    typeGoal();

    fireEvent.mouseDown(screen.getByLabelText(/who is it for/i));
    fireEvent.click(await screen.findByText('Kids'));

    fireEvent.click(screen.getByRole('button', { name: /build the plan/i }));
    await waitFor(() => expect(buildLessonPlanMock).toHaveBeenCalled());

    expect(buildLessonPlanMock.mock.calls[0][0].styleNotes).toMatch(/young children/);
  });

  it('locks the ticks after a failed apply so a retry matches what was created', async () => {
    applyLessonPlanMock.mockRejectedValueOnce(new Error('network died'));
    await reachTwoWeekReview();

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await screen.findByText('network died');

    expect(screen.getByRole('switch', { name: 'Include Snacks' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Include うどん' })).toBeDisabled();
    expect(screen.getByText(/ticks are locked/i)).toBeInTheDocument();
  });

  it("never truncates the educator's own style notes to fit the audience pitch", async () => {
    setup();
    typeGoal();

    fireEvent.mouseDown(screen.getByLabelText(/who is it for/i));
    fireEvent.click(await screen.findByText('Kids'));

    fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
    const long = 'x'.repeat(295);
    fireEvent.change(screen.getByLabelText(/what should the example sentences be like/i), {
      target: { value: long },
    });

    fireEvent.click(screen.getByRole('button', { name: /build the plan/i }));
    await waitFor(() => expect(buildLessonPlanMock).toHaveBeenCalled());

    expect(buildLessonPlanMock.mock.calls[0][0].styleNotes).toBe(long);
  });

  it('opens a print window for the study sheets', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    await reachReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /print study sheets/i }));

    expect(openSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
