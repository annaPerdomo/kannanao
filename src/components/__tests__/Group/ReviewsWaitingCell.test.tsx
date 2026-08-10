import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReviewsWaitingCell } from '@/components/Group/LearnersTable/ReviewsWaitingCell';
import { REVIEW_BACKLOG_THRESHOLD } from '@/components/Group/reviewBacklog';
import type { GroupMember } from '@/hooks/useGroup';
import { renderWithProviders } from '@/test/renderWithProviders';

function member(reviewsWaiting: number | null): GroupMember {
  return { id: 'm1', username: 'kai', reviewsWaiting } as unknown as GroupMember;
}

describe('ReviewsWaitingCell', () => {
  it('shows an explicit 0 when nothing is waiting', () => {
    renderWithProviders(<ReviewsWaitingCell member={member(0)} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('reserves the dash for a count that failed to load', () => {
    renderWithProviders(<ReviewsWaitingCell member={member(null)} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('emphasises a backlog at the attention threshold but not below it', () => {
    const { unmount } = renderWithProviders(
      <ReviewsWaitingCell member={member(REVIEW_BACKLOG_THRESHOLD)} />,
    );
    expect(screen.getByText(String(REVIEW_BACKLOG_THRESHOLD))).toHaveStyle({ fontWeight: 700 });
    unmount();

    renderWithProviders(<ReviewsWaitingCell member={member(REVIEW_BACKLOG_THRESHOLD - 1)} />);
    expect(screen.getByText(String(REVIEW_BACKLOG_THRESHOLD - 1))).not.toHaveStyle({
      fontWeight: 700,
    });
  });
});
