import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StyledDialog } from '@/components/StyledDialog';
import { renderWithProviders } from '@/test/renderWithProviders';

function renderDialog(props: {
  open?: boolean;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  actions?: React.ReactNode;
  closeDisabled?: boolean;
}) {
  return renderWithProviders(
    <StyledDialog
      open={props.open ?? true}
      onClose={props.onClose ?? vi.fn()}
      title={props.title ?? 'Test Dialog'}
      subtitle={props.subtitle}
      icon={props.actions !== undefined ? undefined : <AutoStoriesIcon />}
      actions={props.actions}
      closeDisabled={props.closeDisabled}
    >
      <div>Dialog children</div>
    </StyledDialog>,
  );
}

describe('StyledDialog', () => {
  it('should render the title', () => {
    renderDialog({ title: 'My Dialog Title' });
    expect(screen.getByText('My Dialog Title')).toBeInTheDocument();
  });

  it('should render children', () => {
    renderDialog({});
    expect(screen.getByText('Dialog children')).toBeInTheDocument();
  });

  it('should render the subtitle when provided', () => {
    renderDialog({ subtitle: 'A helpful subtitle' });
    expect(screen.getByText('A helpful subtitle')).toBeInTheDocument();
  });

  it('should render action buttons when actions prop is provided', () => {
    renderDialog({
      actions: <button>Confirm</button>,
    });
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    // MUI Dialog renders a close icon button
    const closeButtons = screen.getAllByRole('button');
    // The close icon button is the one inside the header (not in actions)
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not be in the DOM when open=false', () => {
    renderDialog({ open: false, title: 'Hidden Dialog' });
    expect(screen.queryByText('Hidden Dialog')).not.toBeInTheDocument();
  });

  it('should disable close button when closeDisabled=true', () => {
    renderDialog({ closeDisabled: true });
    const closeButtons = screen.getAllByRole('button');
    const closeBtn = closeButtons.find((btn) => btn.hasAttribute('disabled'));
    expect(closeBtn).toBeTruthy();
  });
});
