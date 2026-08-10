import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FriendshipMeter } from '@/components/FriendshipMeter';
import { renderWithProviders as render } from '@/test/renderWithProviders';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}|${Object.values(params).join(',')}` : key,
}));

describe('FriendshipMeter', () => {
  it('stays level 1 just under the first threshold', () => {
    render(<FriendshipMeter points={14} />);
    expect(screen.getByText('levelNames.1')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'meterAria|levelNames.1,14,15');
  });

  it('reaches level 2 exactly at the threshold', () => {
    render(<FriendshipMeter points={15} />);
    expect(screen.getByText('levelNames.2')).toBeInTheDocument();
    // 0 hearts into a 25-wide level
    expect(screen.getByText('0 / 25')).toBeInTheDocument();
  });

  it('renders max level with a full bar and no needed text', () => {
    render(<FriendshipMeter points={140} />);
    expect(screen.getByText('levelNames.5')).toBeInTheDocument();
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'meterAriaMax|levelNames.5');
  });

  it('hides the numeric progress in the small size', () => {
    render(<FriendshipMeter points={20} size="small" />);
    expect(screen.queryByText('5 / 25')).not.toBeInTheDocument();
    expect(screen.getByText('levelNames.2')).toBeInTheDocument();
  });
});
