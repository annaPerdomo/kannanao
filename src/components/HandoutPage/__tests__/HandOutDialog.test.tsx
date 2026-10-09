import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const handOut = vi.fn();
const clearError = vi.fn();
let edits = { saving: false, error: null as string | null, clearError, handOut };
vi.mock('@/hooks/useLessonEdits', () => ({ useLessonEdits: () => edits }));
vi.mock('@/hooks/useGroup', () => ({
  useGroupMembers: () => ({ members: [{ id: 'm1' }, { id: 'm2' }] }),
}));

import { todayIso } from '@/components/Group/dueDate';
import { nextFriday } from '@/lib/lessonUnits';

import { HandOutDialog } from '../HandOutDialog';

describe('HandOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    edits = { saving: false, error: null, clearError, handOut };
    handOut.mockResolvedValue({ assigned: 2, kanaAssigned: [], kanaFailed: [] });
  });

  it('defaults the dates to today and the next Friday', () => {
    renderWithProviders(
      <HandOutDialog
        open
        onClose={vi.fn()}
        groupId="g1"
        deckId="d2"
        groupName="Tuesday Club"
        wordCount={3}
        kanaSets={[]}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Due date')).toHaveValue(nextFriday(todayIso()));
    expect(screen.getByLabelText('Opens on')).toHaveValue(todayIso());
  });

  it('submits the payload shape and forwards the result', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <HandOutDialog
        open
        onClose={vi.fn()}
        groupId="g1"
        deckId="d2"
        groupName="Tuesday Club"
        wordCount={3}
        kanaSets={['hira-a']}
        onDone={onDone}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hand out to 2 learners' }));

    await vi.waitFor(() =>
      expect(handOut).toHaveBeenCalledWith({
        deckId: 'd2',
        dueDate: nextFriday(todayIso()),
        availableOn: todayIso(),
        withSentences: true,
      }),
    );
    await vi.waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({ assigned: 2, kanaAssigned: [], kanaFailed: [] }),
    );
  });

  it('disables the confirm button while saving', () => {
    edits = { saving: true, error: null, clearError, handOut };
    renderWithProviders(
      <HandOutDialog
        open
        onClose={vi.fn()}
        groupId="g1"
        deckId="d2"
        groupName="Tuesday Club"
        wordCount={3}
        kanaSets={[]}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Hand out to 2 learners' })).toBeDisabled();
  });

  it('shows the error alert when handing out fails', () => {
    edits = { saving: false, error: 'Failed to hand out the lesson.', clearError, handOut };
    renderWithProviders(
      <HandOutDialog
        open
        onClose={vi.fn()}
        groupId="g1"
        deckId="d2"
        groupName="Tuesday Club"
        wordCount={3}
        kanaSets={[]}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByText('Failed to hand out the lesson.')).toBeInTheDocument();
  });

  it('disables the confirm button and warns when dates are out of order', () => {
    renderWithProviders(
      <HandOutDialog
        open
        onClose={vi.fn()}
        groupId="g1"
        deckId="d2"
        groupName="Tuesday Club"
        wordCount={3}
        kanaSets={[]}
        onDone={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Opens on'), { target: { value: '2030-01-10' } });
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2030-01-01' } });

    expect(
      screen.getByText('The open date must be on or before the due date.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hand out to 2 learners' })).toBeDisabled();
  });

  it('forwards a kanaFailed result so the caller can warn', async () => {
    handOut.mockResolvedValue({ assigned: 2, kanaAssigned: [], kanaFailed: ['hira-ka'] });
    const onDone = vi.fn();
    renderWithProviders(
      <HandOutDialog
        open
        onClose={vi.fn()}
        groupId="g1"
        deckId="d2"
        groupName="Tuesday Club"
        wordCount={3}
        kanaSets={[]}
        onDone={onDone}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hand out to 2 learners' }));
    await vi.waitFor(() =>
      expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ kanaFailed: ['hira-ka'] })),
    );
  });
});
