import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PracticeStage } from '@/components/PracticeStage';
import { renderWithProviders } from '@/test/renderWithProviders';

/** Every rule emotion emitted for this render, concatenated. */
function emittedCss(): string {
  return Array.from(document.querySelectorAll('style'))
    .map((el) => el.textContent ?? '')
    .join('');
}

describe('PracticeStage', () => {
  it('renders the exercise it frames', () => {
    renderWithProviders(
      <PracticeStage>
        <p>question</p>
      </PracticeStage>,
    );
    expect(screen.getByText('question')).toBeInTheDocument();
  });

  // A fixed `height` collapsed whichever child was flexible and painted its
  // contents over the rows around it.
  it('claims the viewport as a floor, never as a fixed height', () => {
    renderWithProviders(
      <PracticeStage>
        <p>question</p>
      </PracticeStage>,
    );
    const css = emittedCss();
    expect(css).toMatch(/min-height:max\(460px,\s*calc\(100dvh/);
    expect(css).not.toMatch(/[^-]height:max\(460px/);
  });
});
