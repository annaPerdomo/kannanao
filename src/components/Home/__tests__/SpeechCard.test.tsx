import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SpeechCard } from '@/components/Home';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Ohanashikai } from '@/types/ohanashikai';

function makeSpeech(overrides: Partial<Ohanashikai> = {}): Ohanashikai {
  return {
    id: 'speech-1',
    userId: 'user-1',
    title: 'Self Introduction',
    description: 'Introductory Speech',
    lineCount: 12,
    createdAt: Date.now(),
    pinned: true,
    ...overrides,
  };
}

describe('SpeechCard', () => {
  it('should render the speech title and description', () => {
    renderWithProviders(<SpeechCard speech={makeSpeech()} onOpen={vi.fn()} />);
    expect(screen.getByText('Self Introduction')).toBeInTheDocument();
    expect(screen.getByText('Introductory Speech')).toBeInTheDocument();
  });

  it('should render the line count rather than a card count', () => {
    renderWithProviders(<SpeechCard speech={makeSpeech({ lineCount: 7 })} onOpen={vi.fn()} />);
    expect(screen.getByText(/7 lines/)).toBeInTheDocument();
  });

  it('should call onOpen with the speech id when the card is clicked', () => {
    const onOpen = vi.fn();
    renderWithProviders(<SpeechCard speech={makeSpeech({ id: 'speech-xyz' })} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Self Introduction/ }));
    expect(onOpen).toHaveBeenCalledWith('speech-xyz');
  });

  it('should open on Enter so the card is reachable by keyboard', () => {
    const onOpen = vi.fn();
    renderWithProviders(<SpeechCard speech={makeSpeech()} onOpen={onOpen} />);
    fireEvent.keyDown(screen.getByRole('button', { name: /Self Introduction/ }), {
      key: 'Enter',
    });
    expect(onOpen).toHaveBeenCalledWith('speech-1');
  });

  it('should unpin a pinned speech without also opening it', () => {
    const onPin = vi.fn();
    const onOpen = vi.fn();
    renderWithProviders(<SpeechCard speech={makeSpeech()} onOpen={onOpen} onPin={onPin} />);
    fireEvent.click(screen.getByRole('button', { name: /Unpin from home/i }));
    expect(onPin).toHaveBeenCalledWith('speech-1', false);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('should offer to pin an unpinned speech', () => {
    const onPin = vi.fn();
    renderWithProviders(
      <SpeechCard speech={makeSpeech({ pinned: false })} onOpen={vi.fn()} onPin={onPin} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pin to home/i }));
    expect(onPin).toHaveBeenCalledWith('speech-1', true);
  });

  it('should omit the pin control when no handler is given', () => {
    renderWithProviders(<SpeechCard speech={makeSpeech()} onOpen={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /pin/i })).not.toBeInTheDocument();
  });
});
