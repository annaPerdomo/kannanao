import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/StyledDialog', () => ({
  StyledDialog: ({
    open,
    children,
    title,
    actions,
    onClose,
  }: {
    open: boolean;
    children: React.ReactNode;
    title?: string;
    actions?: React.ReactNode;
    onClose: () => void;
  }) => {
    if (!open) return null;
    return (
      <div role="dialog">
        {title && <h2>{title}</h2>}
        {children}
        {actions}
        <button onClick={onClose}>__close__</button>
      </div>
    );
  },
}));

import { EditNameDialog } from '@/components/NavBar/EditNameDialog';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EditNameDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    nameInput: '',
    onNameInputChange: vi.fn(),
    onSave: vi.fn(),
    saving: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the dialog title', () => {
    renderWithProviders(<EditNameDialog {...defaultProps} />);
    expect(screen.getByText('Edit your name')).toBeInTheDocument();
  });

  it('should render the Display name text field', () => {
    renderWithProviders(<EditNameDialog {...defaultProps} />);
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
  });

  it('should render the Cancel button', () => {
    renderWithProviders(<EditNameDialog {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should render the Save button', () => {
    renderWithProviders(<EditNameDialog {...defaultProps} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should call onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderWithProviders(<EditNameDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSave when Save is clicked with a non-empty name', () => {
    const onSave = vi.fn();
    renderWithProviders(<EditNameDialog {...defaultProps} nameInput="Hana" onSave={onSave} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should disable Save when nameInput is empty', () => {
    renderWithProviders(<EditNameDialog {...defaultProps} nameInput="" />);
    const saveBtn = screen.getByText('Save').closest('button');
    expect(saveBtn).toBeDisabled();
  });

  it('should disable Save when saving is true', () => {
    renderWithProviders(<EditNameDialog {...defaultProps} nameInput="Hana" saving={true} />);
    // When saving, button shows "Saving…" and is disabled
    const saveBtn = screen.getByText('Saving…').closest('button');
    expect(saveBtn).toBeDisabled();
  });

  it('should show "Saving…" label while saving', () => {
    renderWithProviders(<EditNameDialog {...defaultProps} nameInput="Hana" saving={true} />);
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('should call onNameInputChange when typing in the field', () => {
    const onNameInputChange = vi.fn();
    renderWithProviders(
      <EditNameDialog {...defaultProps} nameInput="" onNameInputChange={onNameInputChange} />,
    );
    const input = screen.getByLabelText('Display name');
    fireEvent.change(input, { target: { value: 'Hana' } });
    expect(onNameInputChange).toHaveBeenCalledWith('Hana');
  });

  it('should call onSave when Enter is pressed in the text field', () => {
    const onSave = vi.fn();
    renderWithProviders(<EditNameDialog {...defaultProps} nameInput="Hana" onSave={onSave} />);
    const input = screen.getByLabelText('Display name');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should not render when open is false', () => {
    renderWithProviders(<EditNameDialog {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show the current nameInput value in the field', () => {
    renderWithProviders(<EditNameDialog {...defaultProps} nameInput="Current Name" />);
    const input = screen.getByLabelText('Display name') as HTMLInputElement;
    expect(input.value).toBe('Current Name');
  });
});
