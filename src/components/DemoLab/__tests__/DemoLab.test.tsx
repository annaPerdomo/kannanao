import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEMO_PERSONAS, simulatePersona } from '@/lib/demo';
import { isTricky } from '@/lib/handoutWords';
import { renderWithProviders } from '@/test/renderWithProviders';

import { DemoLab } from '..';

const NOW = new Date('2026-10-23T17:00:00Z');
const MONDAY_WORD = '月よう日';
const MONDAY_ID = 'demo-card-getsuyoubi';

function markMondayWrongAndFinish() {
  const toggleGroup = screen.getByRole('group', { name: `Mark ${MONDAY_WORD} right or wrong` });
  fireEvent.click(within(toggleGroup).getByRole('button', { name: 'Missed it' }));
  fireEvent.click(screen.getByRole('button', { name: "Finish today's practice" }));
}

describe('DemoLab', () => {
  it('marking 月よう日 wrong and finishing shows the real retry-then-back-in-a-day line', () => {
    renderWithProviders(<DemoLab now={NOW} />);

    markMondayWrongAndFinish();

    expect(
      screen.getByText(
        /月よう日: missed → asked again before today's practice ends, then back in 1 day/,
      ),
    ).toBeInTheDocument();
  });

  it('switching persona clears the result', () => {
    renderWithProviders(<DemoLab now={NOW} />);

    markMondayWrongAndFinish();
    expect(screen.getByRole('heading', { name: 'What changed' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ken').closest('[role="button"]')!);

    expect(screen.queryByRole('heading', { name: 'What changed' })).not.toBeInTheDocument();
  });

  it("maya's 月よう日 was already tricky, so finishing leaves her tricky count at 2", () => {
    renderWithProviders(<DemoLab now={NOW} />);

    const mayaSim = simulatePersona(DEMO_PERSONAS.find((p) => p.key === 'maya')!, NOW);
    const mayaRow = mayaSim.progress.find((r) => r.cardId === MONDAY_ID)!;
    const wasTricky = isTricky(mayaRow.correctCount, mayaRow.wrongCount);
    expect(wasTricky).toBe(true);

    markMondayWrongAndFinish();

    const teacherHeading = screen.getByRole('heading', { name: 'What the teacher sees' });
    const teacherSection = teacherHeading.closest('.MuiPaper-root') as HTMLElement;
    const mondayRow = within(teacherSection)
      .getByText(MONDAY_WORD)
      .closest('.MuiStack-root') as HTMLElement;

    const before = 2;
    const after = before + (wasTricky ? 0 : 1);
    expect(after).toBe(2);
    expect(within(mondayRow).getByText(`${after} tricky`)).toBeInTheDocument();
  });
});
