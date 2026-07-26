import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getWeekDates, todayDayIndex, toISODate } from '@/components/TodoList/helpers';
import { WeekStrip } from '@/components/TodoList/WeekStrip';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Todo } from '@/types/todo';

const weekDates = getWeekDates(0);

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 't1',
    userId: 'u1',
    text: 'Practice kana',
    completed: false,
    emoji: '🌸',
    createdAt: Date.now(),
    frequencyDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: [],
    sortOrder: 0,
    repeatUntilDone: false,
    ...overrides,
  };
}

function renderStrip(props: Partial<React.ComponentProps<typeof WeekStrip>> = {}) {
  const onSelectDay = vi.fn();
  const onWeekChange = vi.fn();
  renderWithProviders(
    <WeekStrip
      weekDates={weekDates}
      selectedDayIndex={todayDayIndex()}
      onSelectDay={onSelectDay}
      weekOffset={0}
      onWeekChange={onWeekChange}
      todos={[]}
      entries={[]}
      {...props}
    />,
  );
  return { onSelectDay, onWeekChange };
}

describe('WeekStrip', () => {
  it('renders one day button per day, labelled with its full date', () => {
    renderStrip();
    for (const date of weekDates) {
      const label = new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(date);
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('shows each weekday in kanji with its reading above it', () => {
    renderStrip();
    // 月 (Monday) with げつ — the strip doubles as a reading drill.
    expect(screen.getByText('月')).toBeInTheDocument();
    expect(screen.getByText('げつ')).toBeInTheDocument();
  });

  it('marks today, and only today, as the current date', () => {
    renderStrip();
    const current = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-current') === 'date');
    expect(current).toHaveLength(1);
    const todayLabel = new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(new Date());
    expect(current[0]).toHaveAccessibleName(todayLabel);
  });

  it('selects the day that was tapped', () => {
    const { onSelectDay } = renderStrip();
    const label = new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(weekDates[3]);
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(onSelectDay).toHaveBeenCalledWith(3);
  });

  it('steps the week backwards and forwards', () => {
    const { onWeekChange } = renderStrip();
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(onWeekChange).toHaveBeenCalledWith(-1);
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(onWeekChange).toHaveBeenCalledWith(1);
  });

  it('flags a day whose scheduled to-dos are all done', () => {
    const done = toISODate(weekDates[0]);
    renderStrip({
      todos: [makeTodo({ frequencyDays: [weekDates[0].getDay()], completedDates: [done] })],
    });
    expect(screen.getByText('💖')).toBeInTheDocument();
  });
});
