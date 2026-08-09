import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NudgeButton } from '@/components/Group/AssignmentsList/NudgeButton';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('NudgeButton', () => {
  it('sends and shows the confirmed state, notifying the parent via onSent', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onSent = vi.fn();
    render(
      <NudgeButton
        memberId="m1"
        memberName="Kenji"
        message="Keep it up!"
        onSend={onSend}
        onSent={onSent}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'nudgeAria' }));

    await waitFor(() => expect(screen.getByText('nudgeSentShort')).toBeInTheDocument());
    expect(onSend).toHaveBeenCalledWith('m1', 'Keep it up!', undefined);
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it('shows an error and keeps the button clickable for retry when the send fails', async () => {
    const onSend = vi.fn().mockRejectedValue(new Error('network down'));
    const onSent = vi.fn();
    render(
      <NudgeButton
        memberId="m1"
        memberName="Kenji"
        message="Keep it up!"
        onSend={onSend}
        onSent={onSent}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'nudgeAria' }));

    await waitFor(() => expect(screen.getByText('nudgeFailed')).toBeInTheDocument());
    expect(onSent).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'nudgeAria' })).not.toBeDisabled();

    // Retrying clears the stale error and can succeed.
    onSend.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'nudgeAria' }));
    expect(screen.queryByText('nudgeFailed')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('nudgeSentShort')).toBeInTheDocument());
  });

  it('disables the button while the send is in flight', async () => {
    let release: () => void = () => {};
    const onSend = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    render(<NudgeButton memberId="m1" memberName="Kenji" message="Keep it up!" onSend={onSend} />);

    fireEvent.click(screen.getByRole('button', { name: 'nudgeAria' }));
    expect(screen.getByRole('button', { name: 'nudgeAria' })).toBeDisabled();

    release();
    await waitFor(() => expect(screen.getByText('nudgeSentShort')).toBeInTheDocument());
  });
});
