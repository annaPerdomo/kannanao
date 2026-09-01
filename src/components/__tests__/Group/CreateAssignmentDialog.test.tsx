import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

// The note field is a multiline TextField (MUI TextareaAutosize), which calls
// `new ResizeObserver(...)`. Guarantee a constructable one for this suite.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/components/StyledDialog', () => ({
  StyledDialog: ({
    open,
    children,
    title,
    actions,
  }: {
    open: boolean;
    children: React.ReactNode;
    title?: string;
    actions?: React.ReactNode;
  }) => {
    if (!open) return null;
    return (
      <div role="dialog">
        {title && <h2>{title}</h2>}
        {children}
        {actions}
      </div>
    );
  },
}));

import { CreateAssignmentDialog } from '@/components/Group/CreateAssignmentDialog';
import type { GroupMember } from '@/hooks/useGroup';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const members = [{ id: 'm1', username: 'kai', displayName: 'Kai' }] as unknown as GroupMember[];
const decks = [{ id: 'd1', name: 'Animals', emoji: '🐾' }];

function setup(onCreate = vi.fn().mockResolvedValue(undefined)) {
  renderWithProviders(
    <CreateAssignmentDialog
      open
      onClose={vi.fn()}
      members={members}
      decks={decks}
      onCreate={onCreate}
    />,
  );
  return onCreate;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CreateAssignmentDialog', () => {
  it('creates a plain assignment with no goal fields', async () => {
    const onCreate = setup();
    fireEvent.click(screen.getByText(/Animals/));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /^assign$/i }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    const arg = onCreate.mock.calls[0][0];
    expect(arg.memberIds).toEqual(['m1']);
    expect(arg.deckId).toBe('d1');
    expect(arg.requiredAccuracy).toBeUndefined();
    expect(arg.requiredMode).toBeUndefined();
  });

  it('passes the chosen mastery goal into onCreate', async () => {
    const onCreate = setup();
    fireEvent.click(screen.getByText(/Animals/));
    fireEvent.click(screen.getByRole('checkbox'));

    // Open the optional goal disclosure and pick a goal
    fireEvent.click(screen.getByRole('button', { name: /add a goal/i }));
    fireEvent.click(screen.getByRole('button', { name: '80%' }));
    fireEvent.click(screen.getByRole('button', { name: 'Match' }));

    fireEvent.click(screen.getByRole('button', { name: /^assign$/i }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    const arg = onCreate.mock.calls[0][0];
    expect(arg.requiredAccuracy).toBe(80);
    expect(arg.requiredMode).toBe('match');
  });

  it('keeps Assign disabled until a deck and member are chosen', () => {
    setup();
    const assign = screen.getByRole('button', { name: /^assign$/i });
    expect(assign).toBeDisabled();
    fireEvent.click(screen.getByText(/Animals/));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(assign).toBeEnabled();
  });

  it('assigns a kana row by its characters, with no deckId', async () => {
    const onCreate = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Kana' }));
    fireEvent.click(screen.getByRole('button', { name: 'か · き · く · け · こ' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /^assign$/i }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    const arg = onCreate.mock.calls[0][0];
    expect(arg.kanaSet).toBe('hira-ka');
    expect(arg.deckId).toBeUndefined();
  });

  it('offers both scripts, labelled, so あ and ア can be told apart', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Kana' }));
    expect(screen.getByText('Hiragana')).toBeInTheDocument();
    expect(screen.getByText('Katakana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ア · イ · ウ · エ · オ' })).toBeInTheDocument();
  });

  it('drops the activity question for kana — the activity is fixed', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Kana' }));
    fireEvent.click(screen.getByRole('button', { name: /add a goal/i }));
    expect(screen.getByRole('button', { name: '80%' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Match' })).not.toBeInTheDocument();
  });

  it('clears a mode goal picked on the deck side before switching to kana', async () => {
    const onCreate = setup();
    fireEvent.click(screen.getByText(/Animals/));
    fireEvent.click(screen.getByRole('button', { name: /add a goal/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Match' }));

    fireEvent.click(screen.getByRole('button', { name: 'Kana' }));
    fireEvent.click(screen.getByRole('button', { name: 'か · き · く · け · こ' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /^assign$/i }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreate.mock.calls[0][0].requiredMode).toBeUndefined();
  });
});
