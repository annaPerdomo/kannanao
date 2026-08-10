import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { GroupActivity } from '@/hooks/useGroupActivity';
import { theme } from '@/theme';

import { WeekStatStrip } from '../index';

function renderStrip(activity: GroupActivity | null) {
  return render(
    <ThemeProvider theme={theme}>
      <WeekStatStrip members={[]} activity={activity} />
    </ThemeProvider>,
  );
}

describe('WeekStatStrip', () => {
  it('writes the accuracy pill as an empty stat when nobody studied', () => {
    renderStrip(null);

    expect(screen.getByText('Accuracy: —')).toBeInTheDocument();
    expect(screen.queryByText(/—%/)).not.toBeInTheDocument();
  });
});
