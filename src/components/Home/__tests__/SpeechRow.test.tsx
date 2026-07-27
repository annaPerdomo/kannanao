import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SpeechRow } from '@/components/Home';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Ohanashikai } from '@/types/ohanashikai';

function makeSpeech(overrides: Partial<Ohanashikai> = {}): Ohanashikai {
  return {
    id: 'speech-1',
    userId: 'u1',
    title: 'Self Intro',
    lineCount: 12,
    createdAt: 0,
    pinned: true,
    ...overrides,
  };
}

describe('SpeechRow', () => {
  it('shows the title, line count and XP worth', () => {
    renderWithProviders(<SpeechRow speech={makeSpeech()} onOpen={vi.fn()} />);

    expect(screen.getByText('Self Intro')).toBeInTheDocument();
    expect(screen.getByText('12 lines')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  // The opening line is what makes a pinned speech recognisable, so it outranks
  // the description whenever we have it.
  it('shows the opening line, with its furigana readings', () => {
    renderWithProviders(
      <SpeechRow
        speech={makeSpeech({
          firstLine: '{私|わたし}は{三浦|みうら}です。',
          description: 'For class',
        })}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText('私')).toBeInTheDocument();
    expect(screen.getByText('わたし')).toBeInTheDocument();
    expect(screen.queryByText('For class')).not.toBeInTheDocument();
  });

  it('falls back to the description for a speech with no lines yet', () => {
    renderWithProviders(
      <SpeechRow speech={makeSpeech({ description: 'For class' })} onOpen={vi.fn()} />,
    );
    expect(screen.getByText('For class')).toBeInTheDocument();
  });

  it('opens the speech when the row is clicked', () => {
    const onOpen = vi.fn();
    renderWithProviders(<SpeechRow speech={makeSpeech()} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open speech: Self Intro' }));
    expect(onOpen).toHaveBeenCalledWith('speech-1');
  });

  // The pin sits inside the row but must not open it — and it cannot be nested
  // inside the row's button either, so this pins the two staying separate.
  it('toggles the pin without opening the speech', () => {
    const onOpen = vi.fn();
    const onPin = vi.fn();
    renderWithProviders(
      <SpeechRow speech={makeSpeech({ pinned: true })} onOpen={onOpen} onPin={onPin} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Unpin from home' }));
    expect(onPin).toHaveBeenCalledWith('speech-1', false);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('leaves the pin out when no handler is given', () => {
    renderWithProviders(<SpeechRow speech={makeSpeech()} onOpen={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /pin/i })).not.toBeInTheDocument();
  });
});
