import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PinnableRow } from '@/components/PinnableRow';
import { renderWithProviders } from '@/test/renderWithProviders';

function pin(overrides: Partial<Parameters<typeof PinnableRow>[0]['pin']> = {}) {
  return {
    pinned: false,
    onToggle: vi.fn(),
    pinLabel: 'Pin it',
    unpinLabel: 'Unpin it',
    ...overrides,
  };
}

describe('PinnableRow', () => {
  // A <button> inside a <button> is invalid HTML — the browser drops the inner
  // one, which would silently break every pin on the dashboard. The two controls
  // must stay siblings.
  it('keeps the pin outside the row’s open target', () => {
    renderWithProviders(
      <PinnableRow onOpen={vi.fn()} ariaLabel="Open thing" pin={pin()}>
        content
      </PinnableRow>,
    );

    const open = screen.getByRole('button', { name: 'Open thing' });
    const pinButton = screen.getByRole('button', { name: 'Pin it' });
    expect(open.contains(pinButton)).toBe(false);
  });

  it('opens from the body and pins from the corner, never both', () => {
    const onOpen = vi.fn();
    const onToggle = vi.fn();
    renderWithProviders(
      <PinnableRow onOpen={onOpen} ariaLabel="Open thing" pin={pin({ onToggle })}>
        content
      </PinnableRow>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pin it' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Open thing' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('names the control for what the click will do', () => {
    renderWithProviders(
      <PinnableRow onOpen={vi.fn()} ariaLabel="Open thing" pin={pin({ pinned: true })}>
        content
      </PinnableRow>,
    );
    expect(screen.getByRole('button', { name: 'Unpin it' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pin it' })).not.toBeInTheDocument();
  });

  it('renders no pin at all when none is given', () => {
    renderWithProviders(
      <PinnableRow onOpen={vi.fn()} ariaLabel="Open thing">
        content
      </PinnableRow>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
