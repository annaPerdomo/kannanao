import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataError } from '@/lib/dataError';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ActivityTab } from '../ActivityTab';

describe('ActivityTab', () => {
  it('shows an outage message instead of "no activity" when the feed failed to load', () => {
    renderWithProviders(
      <ActivityTab
        feed={[]}
        feedLoading={false}
        feedError={new DataError('upstream', 'gateway down')}
        activity={null}
        activityLoading={false}
        activityError={null}
      />,
    );
    expect(screen.getByText('Our side is having a problem')).toBeInTheDocument();
    expect(screen.queryByText('No recent activity yet.')).not.toBeInTheDocument();
  });

  it('shows the genuine empty state when there is no error', () => {
    renderWithProviders(
      <ActivityTab
        feed={[]}
        feedLoading={false}
        feedError={null}
        activity={null}
        activityLoading={false}
        activityError={null}
      />,
    );
    expect(screen.getByText('No recent activity yet.')).toBeInTheDocument();
  });
});
