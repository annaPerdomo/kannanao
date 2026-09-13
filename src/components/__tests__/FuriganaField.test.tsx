import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FuriganaField } from '@/components/FuriganaField';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/services/api', () => ({
  formatFurigana: vi.fn(),
}));

describe('FuriganaField', () => {
  it('renders ruby and the edit button in display mode; empty value shows emptyText', () => {
    renderWithProviders(<FuriganaField value="{私|わたし}は" onChange={vi.fn()} label="Example" />);

    expect(screen.getByText('わたし')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit reading' })).toBeInTheDocument();

    renderWithProviders(
      <FuriganaField value="" onChange={vi.fn()} label="Example" emptyText="Nothing yet" />,
    );
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });

  it('edit, change a reading, then Done returns to display mode with the new value', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <FuriganaField value="{私|わたし}は" onChange={onChange} label="Example" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit reading' }));
    fireEvent.change(screen.getByDisplayValue('わたし'), { target: { value: 'わたくし' } });
    expect(onChange).toHaveBeenLastCalledWith('{私|わたくし}は');

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });

  it('edit, change, then Cancel restores the original value', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <FuriganaField value="{私|わたし}は" onChange={onChange} label="Example" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit reading' }));
    fireEvent.change(screen.getByDisplayValue('わたし'), { target: { value: 'わたくし' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onChange).toHaveBeenLastCalledWith('{私|わたし}は');
  });
});
