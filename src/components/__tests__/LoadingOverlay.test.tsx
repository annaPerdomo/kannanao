import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingOverlay } from '@/components/Loading';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('LoadingOverlay', () => {
  it('shows the status message over the skeleton it was given', () => {
    renderWithProviders(
      <LoadingOverlay message="Loading your stats…">
        <div data-testid="skeleton">placeholder</div>
      </LoadingOverlay>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading your stats…');
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('keeps the skeleton in the layout but out of the accessibility tree', () => {
    renderWithProviders(
      <LoadingOverlay>
        <div data-testid="skeleton">placeholder</div>
      </LoadingOverlay>,
    );

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
