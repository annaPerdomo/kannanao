import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DayProgress } from '@/components/TodoList/DayProgress';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('DayProgress', () => {
  it('stays out of the way when the day has no to-dos', () => {
    const { container } = renderWithProviders(<DayProgress completedCount={0} totalCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('reads as one line: what a tick is worth, the bar, and the count', () => {
    renderWithProviders(<DayProgress completedCount={2} totalCount={8} />);
    expect(screen.getByText('+5 XP each')).toBeInTheDocument();
    expect(screen.getByText('2/8 done')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });

  it('swaps the XP hint for a cheer once the day is clear', () => {
    renderWithProviders(<DayProgress completedCount={4} totalCount={4} />);
    expect(screen.getByText('All done! ⭐')).toBeInTheDocument();
    expect(screen.getByText('4/4 done')).toBeInTheDocument();
  });
});
