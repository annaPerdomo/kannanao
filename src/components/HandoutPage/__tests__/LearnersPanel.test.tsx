import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LearnersPanel } from '@/components/HandoutPage/LearnersPanel';
import { renderWithProviders } from '@/test/renderWithProviders';

import { learner } from './fixtures';

describe('LearnersPanel', () => {
  const learners = [
    learner({ id: 'a', name: 'Aki', strong: 9, learning: 1, unseen: 0 }),
    learner({ id: 'b', name: 'Bo', strong: 5, learning: 3, unseen: 2, tricky: 1 }),
    learner({ id: 'c', name: 'Chi', strong: 1, learning: 2, unseen: 7 }),
    learner({ id: 'd', name: 'Dai', unseen: 10 }),
    learner({ id: 'e', name: 'Emi', assigned: false, unseen: 10 }),
  ];

  it("shows each learner's percent of words strong, lowest first and unassigned last", () => {
    renderWithProviders(
      <LearnersPanel
        groupId="g1"
        learners={learners}
        selectedId={null}
        onSelect={vi.fn()}
        onAssign={vi.fn()}
        assigningId={null}
        deckName="Animals"
        onSendEncouragement={vi.fn()}
      />,
    );
    const names = screen.getAllByText(/^(Aki|Bo|Chi|Dai|Emi)$/).map((el) => el.textContent);
    expect(names).toEqual(['Dai', 'Chi', 'Bo', 'Aki', 'Emi']);
    expect(screen.getByText('Learners (5)')).toBeInTheDocument();
    expect(screen.getByText('90% strong')).toBeInTheDocument();
    expect(screen.getByText('50% strong')).toBeInTheDocument();
    expect(screen.getByText('10% strong')).toBeInTheDocument();
    expect(screen.getByText('0% strong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hand out' })).toBeInTheDocument();
    expect(screen.queryByText('Finished')).not.toBeInTheDocument();
    expect(screen.getByText(/1 tricky/)).toBeInTheDocument();
    expect(screen.getByText(/^9 of 10 words strong/)).toBeInTheDocument();
  });

  it('selects a learner by click or keyboard and links to their page', () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <LearnersPanel
        groupId="g1"
        learners={learners}
        selectedId="b"
        onSelect={onSelect}
        onAssign={vi.fn()}
        assigningId={null}
        deckName="Animals"
        onSendEncouragement={vi.fn()}
      />,
    );
    const bo = screen.getByText('Bo').closest('[role="button"]') as HTMLElement;
    expect(bo).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(bo, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));

    expect(screen.getByRole('link', { name: "Open Bo's page" })).toHaveAttribute(
      'href',
      '/group/g1/members/b',
    );
  });

  it('assigns an unassigned learner without selecting them', () => {
    const onSelect = vi.fn();
    const onAssign = vi.fn();
    renderWithProviders(
      <LearnersPanel
        groupId="g1"
        learners={learners}
        selectedId={null}
        onSelect={onSelect}
        onAssign={onAssign}
        assigningId={null}
        deckName="Animals"
        onSendEncouragement={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hand out' }));
    expect(onAssign).toHaveBeenCalledWith(expect.objectContaining({ id: 'e' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows a nudge only for assigned learners who have not finished, and sends it', async () => {
    const onSendEncouragement = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <LearnersPanel
        groupId="g1"
        learners={learners}
        selectedId={null}
        onSelect={vi.fn()}
        onAssign={vi.fn()}
        assigningId={null}
        deckName="Animals"
        onSendEncouragement={onSendEncouragement}
      />,
    );

    const akiRow = screen.getByText('Aki').closest('[role="button"]') as HTMLElement;
    expect(within(akiRow).queryByRole('button', { name: /nudge/i })).not.toBeInTheDocument();
    const emiRow = screen.getByText('Emi').closest('[role="button"]') as HTMLElement;
    expect(within(emiRow).queryByRole('button', { name: /nudge/i })).not.toBeInTheDocument();

    const boRow = screen.getByText('Bo').closest('[role="button"]') as HTMLElement;
    const nudgeButton = within(boRow).getByRole('button', { name: /nudge/i });
    fireEvent.click(nudgeButton);
    expect(onSendEncouragement).toHaveBeenCalledWith(
      'b',
      expect.stringContaining('Animals'),
      undefined,
    );
  });

  it('says so when the group has no learners', () => {
    renderWithProviders(
      <LearnersPanel
        groupId="g1"
        learners={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onAssign={vi.fn()}
        assigningId={null}
        deckName="Animals"
        onSendEncouragement={vi.fn()}
      />,
    );
    expect(screen.getByText('No learners in this group yet.')).toBeInTheDocument();
  });
});
