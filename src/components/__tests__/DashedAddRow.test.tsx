import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DashedAddRow } from '@/components/DashedAddRow';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('DashedAddRow', () => {
  it('prefixes the label with a plus and calls back when clicked', () => {
    const onClick = vi.fn();
    renderWithProviders(<DashedAddRow label="Create a group" onClick={onClick} />);

    const button = screen.getByRole('button', { name: /Create a group/ });
    expect(button).toHaveTextContent('＋ Create a group');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });
});
