import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TitleFurigana from '@/components/TitleFurigana';
import { renderWithProviders } from '@/test/renderWithProviders';

const MARKUP = '{貸|か}す';

describe('TitleFurigana', () => {
  it('renders plain ruby when not masked', () => {
    renderWithProviders(<TitleFurigana markup={MARKUP} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('か')).toBeInTheDocument();
  });

  it('masked: tapping the word toggles the peek', () => {
    renderWithProviders(<TitleFurigana markup={MARKUP} masked />);

    const word = screen.getByRole('button', { name: 'Show reading' });
    fireEvent.click(word);
    expect(word).toHaveAccessibleName('Hide reading');
    fireEvent.click(word);
    expect(word).toHaveAccessibleName('Show reading');
  });

  it('masked: Enter and Space peek from the keyboard', () => {
    renderWithProviders(<TitleFurigana markup={MARKUP} masked />);

    const word = screen.getByRole('button', { name: 'Show reading' });
    fireEvent.keyDown(word, { key: 'Enter' });
    expect(word).toHaveAccessibleName('Hide reading');
    fireEvent.keyDown(word, { key: ' ' });
    expect(word).toHaveAccessibleName('Show reading');
  });

  it('a peek does not bubble to the flip handler behind it', () => {
    const onFlip = vi.fn();
    renderWithProviders(
      <div onClick={onFlip} role="presentation">
        <TitleFurigana markup={MARKUP} masked />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show reading' }));
    expect(onFlip).not.toHaveBeenCalled();
  });

  it('resets the peek when the card changes', () => {
    const { rerender } = renderWithProviders(<TitleFurigana markup={MARKUP} masked />);
    fireEvent.click(screen.getByRole('button', { name: 'Show reading' }));
    expect(screen.getByRole('button')).toHaveAccessibleName('Hide reading');

    rerender(<TitleFurigana markup="{猫|ねこ}" masked />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Show reading');
  });
});
