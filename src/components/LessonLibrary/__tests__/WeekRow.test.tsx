import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonUnitWeek } from '@/types/lessonUnit';

import { WeekRow } from '../WeekRow';

function week(overrides: Partial<LessonUnitWeek> = {}): LessonUnitWeek {
  return {
    deckId: 'd1',
    deckName: 'Food',
    deckEmoji: null,
    week: 1,
    title: null,
    note: null,
    dueDate: '2026-09-01',
    availableOn: '2026-08-25',
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

describe('WeekRow', () => {
  it('shows "Not handed out yet" instead of the dates for a draft', () => {
    renderWithProviders(
      <WeekRow week={week({ status: 'draft', handedOut: false })} onOpen={vi.fn()} />,
    );
    expect(screen.getByText('Not handed out yet')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows the due/opens dates for a non-draft week', () => {
    renderWithProviders(<WeekRow week={week()} onOpen={vi.fn()} />);
    expect(screen.queryByText('Not handed out yet')).not.toBeInTheDocument();
    expect(screen.getByText(/Opens/)).toBeInTheDocument();
  });

  it('shows up to 4 kana chips and a +N for the rest', () => {
    renderWithProviders(
      <WeekRow
        week={week({ kanaSets: ['hira-a', 'hira-ka', 'hira-sa', 'hira-ta', 'hira-na'] })}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText('Sounds')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('shows no sounds line when the week has no kana sets', () => {
    renderWithProviders(<WeekRow week={week({ kanaSets: [] })} onOpen={vi.fn()} />);
    expect(screen.queryByText('Sounds')).not.toBeInTheDocument();
  });
});
