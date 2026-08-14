import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LevelUpMeter } from '@/components/BuddyFriendship/LevelUpMeter';
import { renderWithProviders as render } from '@/test/renderWithProviders';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}|${Object.values(params).join(',')}` : key,
}));

describe('LevelUpMeter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('completes the old level before rolling to the new one', () => {
    vi.useFakeTimers();
    render(<LevelUpMeter level={3} reduced={false} />);

    expect(screen.getByText('levelNames.2')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('progressbar', { hidden: true })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('levelNames.3')).toBeInTheDocument();
    expect(screen.getByText('0 / 40')).toBeInTheDocument();
  });

  it('lands on the new level with no animation when motion is reduced', () => {
    render(<LevelUpMeter level={3} reduced />);

    expect(screen.getByText('levelNames.3')).toBeInTheDocument();
    expect(screen.queryByText('levelNames.2')).toBeNull();
  });

  it('rolls over when motion is reduced only after mount', () => {
    const { rerender } = render(<LevelUpMeter level={3} reduced={false} />);
    expect(screen.getByText('levelNames.2')).toBeInTheDocument();

    rerender(<LevelUpMeter level={3} reduced />);
    expect(screen.getByText('levelNames.3')).toBeInTheDocument();
  });

  it('holds at max level instead of rolling past it', () => {
    render(<LevelUpMeter level={5} reduced />);

    expect(screen.getByText('levelNames.5')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'meterAriaMax|levelNames.5');
  });
});
