import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { isGroupDashboardTab } from '@/components/Group/DashboardTabs/constants';
import { TabBar } from '@/components/Group/DashboardTabs/TabBar';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('isGroupDashboardTab', () => {
  it('accepts every known tab key', () => {
    expect(isGroupDashboardTab('today')).toBe(true);
    expect(isGroupDashboardTab('plan')).toBe(true);
    expect(isGroupDashboardTab('learners')).toBe(true);
    expect(isGroupDashboardTab('words')).toBe(true);
  });

  it('rejects unknown or missing values', () => {
    expect(isGroupDashboardTab('bogus')).toBe(false);
    expect(isGroupDashboardTab('')).toBe(false);
    expect(isGroupDashboardTab(null)).toBe(false);
  });
});

describe('TabBar', () => {
  it('renders every tab with its label', () => {
    renderWithProviders(<TabBar value="today" onChange={vi.fn()} />);

    expect(screen.getByRole('tab', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Plan' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Learners' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Words' })).toBeInTheDocument();
  });

  it('marks the current value as selected', () => {
    renderWithProviders(<TabBar value="words" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Words' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'false');
  });

  it('reports the clicked tab', () => {
    const onChange = vi.fn();
    renderWithProviders(<TabBar value="today" onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Plan' }));
    expect(onChange).toHaveBeenCalledWith('plan');
  });
});
