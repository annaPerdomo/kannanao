import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { isGroupDashboardTab } from '@/components/Group/DashboardTabs/constants';
import { TabBar } from '@/components/Group/DashboardTabs/TabBar';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('isGroupDashboardTab', () => {
  it('accepts every known tab key', () => {
    expect(isGroupDashboardTab('overview')).toBe(true);
    expect(isGroupDashboardTab('learners')).toBe(true);
    expect(isGroupDashboardTab('assignments')).toBe(true);
    expect(isGroupDashboardTab('words')).toBe(true);
    expect(isGroupDashboardTab('activity')).toBe(true);
  });

  it('rejects unknown or missing values', () => {
    expect(isGroupDashboardTab('bogus')).toBe(false);
    expect(isGroupDashboardTab('')).toBe(false);
    expect(isGroupDashboardTab(null)).toBe(false);
  });
});

describe('TabBar', () => {
  it('renders every tab with its label', () => {
    renderWithProviders(<TabBar value="overview" onChange={vi.fn()} />);

    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Learners' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Assignments' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Words' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
  });

  it('marks the current value as selected', () => {
    renderWithProviders(<TabBar value="words" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Words' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false');
  });

  it('reports the clicked tab', () => {
    const onChange = vi.fn();
    renderWithProviders(<TabBar value="overview" onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Assignments' }));
    expect(onChange).toHaveBeenCalledWith('assignments');
  });
});
