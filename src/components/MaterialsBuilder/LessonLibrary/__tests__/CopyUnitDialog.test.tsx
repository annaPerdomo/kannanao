import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonUnit } from '@/types/lessonUnit';

import { CopyUnitDialog } from '../CopyUnitDialog';

function unit(overrides: Partial<LessonUnit> = {}): LessonUnit {
  return {
    id: 'plan1',
    title: 'Unit 1',
    level: 'N5',
    createdAt: '2026-01-01T00:00:00Z',
    weeks: [
      {
        deckId: 'd1',
        deckName: 'Greetings',
        deckEmoji: null,
        week: 1,
        title: 'Week 1',
        note: null,
        dueDate: '2026-09-01',
        availableOn: '2026-08-25',
        requiredAccuracy: null,
        requiredMode: null,
        learnerCount: 0,
        finishedCount: 0,
        status: 'past',
      },
    ],
    ...overrides,
  };
}

const GROUP_A = { id: 'g1', name: 'Section A' };
const GROUP_B = { id: 'g2', name: 'Section B' };
const GROUP_C = { id: 'g3', name: 'Section C' };

describe('CopyUnitDialog', () => {
  const onClose = vi.fn();
  const onCopy = vi.fn();
  const onSwitchGroup = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
    onCopy.mockReset().mockResolvedValue({ status: 'ok', added: 1, skipped: [] });
    onSwitchGroup.mockReset();
  });

  it('shows the no-other-group sentence and no form when there is only the source group', () => {
    renderWithProviders(
      <CopyUnitDialog
        open
        onClose={onClose}
        unit={unit()}
        groups={[GROUP_A]}
        sourceGroupId="g1"
        saving={false}
        onCopy={onCopy}
        onSwitchGroup={onSwitchGroup}
      />,
    );
    expect(screen.getByText('Make another group first to reuse this unit.')).toBeInTheDocument();
    expect(screen.queryByLabelText('First week due')).not.toBeInTheDocument();
  });

  it('shows a preview line with the rebased first and last due dates', () => {
    renderWithProviders(
      <CopyUnitDialog
        open
        onClose={onClose}
        unit={unit()}
        groups={[GROUP_A, GROUP_B]}
        sourceGroupId="g1"
        saving={false}
        onCopy={onCopy}
        onSwitchGroup={onSwitchGroup}
      />,
    );
    expect(screen.getByText('Copy to Section B')).toBeInTheDocument();

    const dateField = screen.getByLabelText('First week due');
    fireEvent.change(dateField, { target: { value: '2026-10-13' } });
    expect(screen.getByText('1 weeks, Oct 13 → Oct 13')).toBeInTheDocument();
  });

  it('shows the success view listing skipped decks and calls onSwitchGroup from the Done/Open buttons', async () => {
    onCopy.mockResolvedValue({ status: 'ok', added: 1, skipped: ['Family'] });
    renderWithProviders(
      <CopyUnitDialog
        open
        onClose={onClose}
        unit={unit()}
        groups={[GROUP_A, GROUP_B]}
        sourceGroupId="g1"
        saving={false}
        onCopy={onCopy}
        onSwitchGroup={onSwitchGroup}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use with another group' }));
    await screen.findByText('Added 1 weeks to Section B.');
    expect(screen.getByText('Already handed out there: Family.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Section B' }));
    expect(onSwitchGroup).toHaveBeenCalledWith('g2');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the "every week already handed out" message on a nothing_to_copy outcome', async () => {
    onCopy.mockResolvedValue({ status: 'nothing' });
    renderWithProviders(
      <CopyUnitDialog
        open
        onClose={onClose}
        unit={unit()}
        groups={[GROUP_A, GROUP_B]}
        sourceGroupId="g1"
        saving={false}
        onCopy={onCopy}
        onSwitchGroup={onSwitchGroup}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use with another group' }));
    await screen.findByText('Every week is already handed out in that group.');
  });

  it('does not reset the form when the groups list changes while the dialog stays open', () => {
    const { rerender } = renderWithProviders(
      <CopyUnitDialog
        open
        onClose={onClose}
        unit={unit()}
        groups={[GROUP_A, GROUP_B]}
        sourceGroupId="g1"
        saving={false}
        onCopy={onCopy}
        onSwitchGroup={onSwitchGroup}
      />,
    );

    const dateField = screen.getByLabelText('First week due');
    fireEvent.change(dateField, { target: { value: '2026-11-01' } });
    expect(dateField).toHaveValue('2026-11-01');

    rerender(
      <CopyUnitDialog
        open
        onClose={onClose}
        unit={unit()}
        groups={[GROUP_A, GROUP_B, GROUP_C]}
        sourceGroupId="g1"
        saving={false}
        onCopy={onCopy}
        onSwitchGroup={onSwitchGroup}
      />,
    );

    expect(screen.getByLabelText('First week due')).toHaveValue('2026-11-01');
  });

  it('lets the teacher pick among several other groups via the group selector', () => {
    renderWithProviders(
      <CopyUnitDialog
        open
        onClose={onClose}
        unit={unit()}
        groups={[GROUP_A, GROUP_B, GROUP_C]}
        sourceGroupId="g1"
        saving={false}
        onCopy={onCopy}
        onSwitchGroup={onSwitchGroup}
      />,
    );
    expect(screen.queryByText('Copy to Section B')).not.toBeInTheDocument();
    expect(screen.getByText('Group')).toBeInTheDocument();
  });
});
