import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const buildLessonPlanMock = vi.fn();
const applyLessonPlanMock = vi.fn();

vi.mock('@/services/api', () => ({
  buildLessonPlan: (...args: unknown[]) => buildLessonPlanMock(...args),
  applyLessonPlan: (...args: unknown[]) => applyLessonPlanMock(...args),
  uploadLessonDocument: vi.fn(),
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isMemberAccount: false, loading: false }),
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({
    groups: [{ id: 'g1', organizer_id: 'org1', name: 'Japanese 1', emoji: null }],
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useLessonLibrary', () => ({
  LESSON_LIBRARY_CACHE_PREFIX: '/api/group/lessons',
  useLessonLibrary: () => ({
    library: { units: [], loose: [] },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/apiCache', () => ({ invalidateApiCache: vi.fn() }));

import { MaterialsBuilder } from '@/components/MaterialsBuilder';

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

beforeEach(() => {
  vi.clearAllMocks();
  buildLessonPlanMock.mockResolvedValue({ plan: PLAN });
  applyLessonPlanMock.mockResolvedValue({ results: [{ name: 'Food words', status: 'created' }] });
});

describe('MaterialsBuilder — lesson set stays mounted across tabs', () => {
  it('keeps the applied plan (and its print buttons) after visiting Assigned and coming back', async () => {
    renderWithProviders(<MaterialsBuilder />);

    fireEvent.change(screen.getByLabelText(/what do you want to cover/i), {
      target: { value: 'Food words' },
    });
    fireEvent.click(screen.getByRole('button', { name: /build the plan/i }));
    await screen.findByDisplayValue('Food words');

    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));
    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());
    await screen.findByText(/created and assigned/i);
    expect(screen.getByRole('button', { name: /print study sheets/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /see it in assigned/i }));
    // Hidden, not unmounted — the just-applied plan survives the tab switch.
    expect(screen.getByText(/created and assigned/i)).not.toBeVisible();
    expect(screen.getByText('Nothing assigned to this group yet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /lesson set/i }));
    expect(screen.getByText(/created and assigned/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /print study sheets/i })).toBeInTheDocument();
  });
});
