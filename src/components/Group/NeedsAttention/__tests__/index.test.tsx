import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { theme } from '@/theme';

import { NeedsAttention } from '../index';

function renderPanel(overrides: Record<string, unknown> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <NeedsAttention
        groupId="g1"
        members={[]}
        assignments={[]}
        onSelectMember={vi.fn()}
        onViewAssignments={vi.fn()}
        onViewLearners={vi.fn()}
        onViewWords={vi.fn()}
        onSendEncouragement={vi.fn()}
        {...overrides}
      />
    </ThemeProvider>,
  );
}

describe('NeedsAttention', () => {
  it('says all caught up when every source loaded and produced nothing', () => {
    renderPanel();
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
  });

  it('surfaces a difficult-words failure instead of claiming all caught up', () => {
    renderPanel({ wordsError: 'Could not load difficult words.' });

    expect(screen.getByText('Could not load difficult words.')).toBeInTheDocument();
    expect(screen.queryByText(/All caught up/)).not.toBeInTheDocument();
  });

  it('shows both failures when neither list arrived', () => {
    renderPanel({
      assignmentsError: 'Could not load assignments.',
      wordsError: 'Could not load difficult words.',
    });

    expect(screen.getByText('Could not load assignments.')).toBeInTheDocument();
    expect(screen.getByText('Could not load difficult words.')).toBeInTheDocument();
  });
});
