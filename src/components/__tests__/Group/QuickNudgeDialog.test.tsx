import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

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

vi.mock('@/components/Group/EncouragementEmojiPicker', () => ({
  EncouragementEmojiPicker: () => null,
}));

import { QuickNudgeDialog } from '@/components/Group/NeedsAttention/QuickNudgeDialog';

const target = { id: 'm1', name: 'Kenji', lastNudgedAt: null };
const DEFAULT_MESSAGE = 'Miss you! Come back and practice today 💪';

type SendFn = (memberId: string, message: string, emoji?: string) => Promise<unknown>;

function setup(onSend: SendFn, onSent = vi.fn(), onClose = vi.fn()) {
  renderWithProviders(
    <QuickNudgeDialog open target={target} onClose={onClose} onSend={onSend} onSent={onSent} />,
  );
  return { onSent, onClose };
}

describe('QuickNudgeDialog', () => {
  it('tells the parent to close once the send succeeds', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const { onSent } = setup(onSend);

    fireEvent.click(screen.getByRole('button', { name: 'Send nudge' }));

    await waitFor(() => expect(onSent).toHaveBeenCalledWith('💪'));
    expect(onSend).toHaveBeenCalledWith('m1', DEFAULT_MESSAGE, '💪');
  });

  it('stays open and shows the error when the send fails', async () => {
    const onSend = vi.fn().mockRejectedValue(new Error('network down'));
    const { onSent } = setup(onSend);

    fireEvent.click(screen.getByRole('button', { name: 'Send nudge' }));

    await waitFor(() =>
      expect(
        screen.getByText('Failed to send to some members. Please try again.'),
      ).toBeInTheDocument(),
    );
    expect(onSent).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
