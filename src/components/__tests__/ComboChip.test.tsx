import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ComboChip } from '@/components/ComboChip';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('ComboChip', () => {
  it('is hidden below a 2-combo (no "combo" to show yet)', () => {
    const { container } = renderWithProviders(<ComboChip count={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the run count with the flame from 2 upward', () => {
    renderWithProviders(<ComboChip count={4} />);
    const chip = screen.getByRole('status', { name: /combo 4 in a row/i });
    expect(chip).toHaveTextContent('×4');
    expect(chip).toHaveTextContent('🔥');
  });
});
