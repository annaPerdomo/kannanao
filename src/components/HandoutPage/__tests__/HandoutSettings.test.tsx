import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HandoutSettings } from '@/components/HandoutPage/HandoutSettings';
import { renderWithProviders } from '@/test/renderWithProviders';

import { week } from './fixtures';

function setup(overrides: Partial<Parameters<typeof HandoutSettings>[0]> = {}) {
  const props = {
    week: week(),
    groupName: 'Tuesday Club',
    saving: false,
    onSave: vi.fn().mockResolvedValue(true),
    onRemove: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  renderWithProviders(<HandoutSettings {...props} />);
  return props;
}

describe('HandoutSettings', () => {
  it('keeps Save disabled until something changes, then saves the whole patch', () => {
    const props = setup();
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('What learners will be able to do'), {
      target: { value: '  Order food ' },
    });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    expect(props.onSave).toHaveBeenCalledWith({
      note: 'Order food',
      availableOn: '2026-10-02',
      dueDate: '2026-10-09',
      requiredAccuracy: null,
      requiredMode: null,
      baselineAccuracy: 80,
    });
  });

  it('discards unsaved changes back to the saved values', () => {
    setup();
    const note = screen.getByLabelText('What learners will be able to do');
    fireEvent.change(note, { target: { value: 'Draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(note).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('blocks Save when the open date is after the due date', () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText('Opens'), { target: { value: '2026-10-20' } });
    expect(
      screen.getByText('The open date must be on or before the due date.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('shows an error when saving fails', async () => {
    setup({ onSave: vi.fn().mockResolvedValue(false) });
    fireEvent.change(screen.getByLabelText('What learners will be able to do'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText("Couldn't save. Try again.")).toBeInTheDocument();
  });

  it('removes a unit week through the confirm view', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove this week' }));
    expect(screen.getByText(/Remove week 1 from this unit/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(props.onRemove).toHaveBeenCalled();
  });

  it('uses handout wording for a loose handout', () => {
    setup({ week: week({ week: null }) });
    fireEvent.click(screen.getByRole('button', { name: 'Stop handing this out' }));
    expect(screen.getByText(/Stop handing this out to the group/)).toBeInTheDocument();
  });
});
