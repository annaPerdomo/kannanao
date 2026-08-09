import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NeedsAttentionRow } from '@/components/Group/NeedsAttention/Row';
import type { AttentionItem } from '@/components/Group/NeedsAttention/types';
import { renderWithProviders } from '@/test/renderWithProviders';

function renderRow(item: AttentionItem) {
  return renderWithProviders(
    <NeedsAttentionRow
      item={item}
      onSelectMember={vi.fn()}
      onSendNudge={vi.fn()}
      onViewAssignments={vi.fn()}
      onViewLearners={vi.fn()}
    />,
  );
}

const inactive = {
  kind: 'inactiveLearner',
  severity: 'error',
  memberId: 'm1',
  name: 'Kai',
  days: 9,
  lastActive: '2026-07-30T00:00:00Z',
  reviewsWaiting: 0,
  reviewsOverdue3d: 0,
} satisfies AttentionItem;

describe('NeedsAttentionRow — review backlog', () => {
  it('names the learner and their backlog size', () => {
    renderRow({
      kind: 'reviewBacklog',
      severity: 'info',
      memberId: 'm1',
      name: 'Kai',
      reviewsWaiting: 34,
      reviewsOverdue3d: 12,
    });

    expect(screen.getByText('Kai has 34 reviews waiting')).toBeInTheDocument();
    expect(screen.getByText('12 are more than 3 days overdue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Kai' })).toBeInTheDocument();
  });

  it('drops the overdue sub-line when nothing is 3+ days late', () => {
    renderRow({
      kind: 'reviewBacklog',
      severity: 'info',
      memberId: 'm1',
      name: 'Kai',
      reviewsWaiting: 22,
      reviewsOverdue3d: 0,
    });

    expect(screen.queryByText(/more than 3 days overdue/)).not.toBeInTheDocument();
  });

  it("appends the backlog to an inactive learner's sub-line rather than standing alone", () => {
    renderRow({ ...inactive, reviewsWaiting: 40, reviewsOverdue3d: 40 });
    expect(screen.getByText(/· 40 reviews waiting$/)).toBeInTheDocument();
  });

  it('leaves the inactive sub-line untouched when there is no backlog', () => {
    renderRow(inactive);
    expect(screen.queryByText(/reviews waiting/)).not.toBeInTheDocument();
  });

  it('holds the suffix below the attention threshold', () => {
    renderRow({ ...inactive, reviewsWaiting: 3, reviewsOverdue3d: 3 });
    expect(screen.queryByText(/reviews waiting/)).not.toBeInTheDocument();
  });

  it('holds the suffix when the backlog count failed to load', () => {
    renderRow({ ...inactive, reviewsWaiting: null, reviewsOverdue3d: null });
    expect(screen.queryByText(/reviews waiting/)).not.toBeInTheDocument();
  });

  it('summarises many backlogs into one row pointing at the learners table', () => {
    renderRow({ kind: 'reviewBacklogCollapsed', severity: 'info', count: 6 });
    expect(screen.getByText('6 learners have reviews piling up')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View learners' })).toBeInTheDocument();
  });
});
