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
}));

vi.mock('@/components/Loading', () => ({ Loading: () => <div>loading</div> }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isMemberAccount: false, loading: false }),
}));

vi.mock('@/hooks/useGroup', () => ({
  useGroupMembers: () => ({
    members: [{ id: 'm1', username: 'naomi', displayName: 'Naomi' }],
    loading: false,
  }),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { LessonBuilder } from '@/components/Group/LessonBuilder';

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
  renderWithProviders(<LessonBuilder groupId="g1" />);
}

async function reachReviewStep() {
  setup();
  fireEvent.change(screen.getByLabelText(/what do you want to cover/i), {
    target: { value: 'Food words' },
  });
  fireEvent.mouseDown(screen.getByLabelText(/who is it for/i));
  fireEvent.click(await screen.findByText('Naomi'));
  fireEvent.click(screen.getByRole('button', { name: /build the plan/i }));
  await screen.findByDisplayValue('Food words');
}

beforeEach(() => {
  vi.clearAllMocks();
  buildLessonPlanMock.mockResolvedValue({
    plan: PLAN,
    knownWords: [{ word: 'ねこ', reading: 'ねこ' }],
  });
  applyLessonPlanMock.mockResolvedValue({ results: [{ name: 'Food words', status: 'created' }] });
});

describe('LessonBuilder', () => {
  it('keeps the build button disabled until a goal and a learner are chosen', async () => {
    setup();

    expect(screen.getByRole('button', { name: /build the plan/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/what do you want to cover/i), {
      target: { value: 'Food words' },
    });
    expect(screen.getByRole('button', { name: /build the plan/i })).toBeDisabled();

    fireEvent.mouseDown(screen.getByLabelText(/who is it for/i));
    fireEvent.click(await screen.findByText('Naomi'));
    expect(screen.getByRole('button', { name: /build the plan/i })).toBeEnabled();
  });

  it('lists the plan decks and cards after a plan comes back', async () => {
    await reachReviewStep();

    expect(buildLessonPlanMock).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: 'm1', goal: 'Food words' }),
    );
    expect(screen.getByLabelText('Word')).toHaveValue('ラーメン');
    expect(screen.getByLabelText('Example (Japanese)')).toHaveValue('ラーメンをたべます');
  });

  it('applies the edited plan, not the original', async () => {
    await reachReviewStep();

    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'うどん' } });
    fireEvent.click(screen.getByRole('button', { name: /create decks & assign/i }));

    await waitFor(() => expect(applyLessonPlanMock).toHaveBeenCalled());

    const payload = applyLessonPlanMock.mock.calls[0][0];
    expect(payload.plan.decks[0].cards[0].word).toBe('うどん');
    expect(payload).toMatchObject({ groupId: 'g1', memberId: 'm1' });
  });
});
