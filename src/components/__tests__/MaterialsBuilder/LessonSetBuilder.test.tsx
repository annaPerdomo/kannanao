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
  fetchImage: vi.fn(),
  encodeUnsplashUrl: vi.fn(),
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

function setup() {
  renderWithProviders(<LessonSetBuilder groups={[GROUP]} groupId="g1" onGroupChange={vi.fn()} />);
}

function typeGoal() {
  fireEvent.change(screen.getByLabelText(/what do you want to cover/i), {
    target: { value: 'Food words' },
  });
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

  it('folds the chosen audience into the styleNotes sent when building', async () => {
    setup();
    typeGoal();

    fireEvent.mouseDown(screen.getByLabelText(/who is it for/i));
    fireEvent.click(await screen.findByText('Kids'));

    fireEvent.click(screen.getByRole('button', { name: /build the plan/i }));
    await waitFor(() => expect(buildLessonPlanMock).toHaveBeenCalled());

    expect(buildLessonPlanMock.mock.calls[0][0].styleNotes).toMatch(/young children/);
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
});
