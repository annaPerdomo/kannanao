import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_URL } from '@/lib/brand';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonPlan } from '@/types/lessonPlan';

vi.mock('@/lib/homePracticePrintable', () => ({
  buildHomePracticeHtml: vi.fn().mockReturnValue('<html></html>'),
}));

vi.mock('@/lib/lessonPrintable', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/lessonPrintable')>('@/lib/lessonPrintable');
  return { ...actual, openPrintWindow: vi.fn() };
});

import { HomePracticeSection } from '@/components/MaterialsBuilder/ReferenceSheetsDialog/HomePracticeSection';
import { buildHomePracticeHtml } from '@/lib/homePracticePrintable';
import { openPrintWindow } from '@/lib/lessonPrintable';

const PLAN: LessonPlan = {
  decks: [
    {
      name: 'Food words',
      description: '',
      emoji: '🍜',
      mainViewMode: 'kanji',
      cards: [
        {
          word: '食べる',
          reading: 'たべる',
          meaning: 'to eat',
          exampleJp: '',
          exampleEn: '',
          jlptLevel: 'N5',
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HomePracticeSection', () => {
  it('builds the sheet with a qr whose url ends with /review/start and svg that starts with <svg', () => {
    vi.mocked(openPrintWindow).mockReturnValue(true);
    renderWithProviders(<HomePracticeSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /print home practice/i }));

    expect(buildHomePracticeHtml).toHaveBeenCalledTimes(1);
    const args = vi.mocked(buildHomePracticeHtml).mock.calls[0][0];
    expect(args.qr?.url).toBe(`${APP_URL}/review/start`);
    expect(args.qr?.svg.startsWith('<svg')).toBe(true);
    expect(args.labels.days).toHaveLength(7);
  });

  it('passes furigana: false when the checkbox is unticked', () => {
    vi.mocked(openPrintWindow).mockReturnValue(true);
    renderWithProviders(<HomePracticeSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /furigana/i }));
    fireEvent.click(screen.getByRole('button', { name: /print home practice/i }));

    expect(buildHomePracticeHtml).toHaveBeenCalledWith(
      expect.objectContaining({ options: { furigana: false } }),
    );
  });

  it('shows the empty state and disables the button when the plan has no printable words', () => {
    renderWithProviders(
      <HomePracticeSection plan={{ decks: [] }} locale="en" onPopupBlocked={vi.fn()} />,
    );

    expect(screen.getByText(/add some words first/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print home practice/i })).toBeDisabled();
  });

  it('reports a blocked popup', () => {
    vi.mocked(openPrintWindow).mockReturnValue(false);
    const onPopupBlocked = vi.fn();
    renderWithProviders(
      <HomePracticeSection plan={PLAN} locale="en" onPopupBlocked={onPopupBlocked} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /print home practice/i }));

    expect(onPopupBlocked).toHaveBeenCalledWith(true);
  });
});
