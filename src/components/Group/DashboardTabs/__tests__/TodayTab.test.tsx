import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataError } from '@/lib/dataError';
import { renderWithProviders } from '@/test/renderWithProviders';

import { TodayTab } from '../TodayTab';

function baseProps(overrides: Partial<Parameters<typeof TodayTab>[0]> = {}) {
  return {
    groupId: 'g1',
    members: [],
    activity: null,
    activityLoading: false,
    activityError: null,
    words: undefined,
    wordsLoading: false,
    wordsError: null,
    assignments: [],
    assignmentsLoading: false,
    assignmentsError: null,
    ownDecks: [],
    canAssign: false,
    onNavigateTab: vi.fn(),
    onViewPlan: vi.fn(),
    onBuild: vi.fn(),
    onAssignDeck: vi.fn(),
    onSelectMember: vi.fn(),
    onSendEncouragement: vi.fn(),
    feed: [],
    feedLoading: false,
    feedError: null,
    ...overrides,
  };
}

describe('TodayTab', () => {
  it('shows an outage message instead of "no activity" when the feed failed to load', () => {
    renderWithProviders(
      <TodayTab {...baseProps({ feedError: new DataError('upstream', 'gateway down') })} />,
    );
    expect(screen.getByText('Our side is having a problem')).toBeInTheDocument();
    expect(screen.queryByText('No recent activity yet.')).not.toBeInTheDocument();
  });

  it('shows the genuine empty state when there is no error', () => {
    renderWithProviders(<TodayTab {...baseProps()} />);
    expect(screen.getByText('No recent activity yet.')).toBeInTheDocument();
  });

  it('calls onBuild, not onViewPlan, when the "Make new materials" CTA is clicked', () => {
    const onBuild = vi.fn();
    const onViewPlan = vi.fn();
    renderWithProviders(<TodayTab {...baseProps({ onBuild, onViewPlan })} />);
    fireEvent.click(screen.getByText('Make new materials'));
    expect(onBuild).toHaveBeenCalled();
    expect(onViewPlan).not.toHaveBeenCalled();
  });

  it('calls onViewPlan, not onBuild, when "See the plan" is clicked', () => {
    const onBuild = vi.fn();
    const onViewPlan = vi.fn();
    renderWithProviders(<TodayTab {...baseProps({ onBuild, onViewPlan })} />);
    fireEvent.click(screen.getByText('See the plan'));
    expect(onViewPlan).toHaveBeenCalled();
    expect(onBuild).not.toHaveBeenCalled();
  });
});
