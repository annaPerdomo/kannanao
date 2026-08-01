import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Direct import, not the barrel — DeckHeader & friends would muddy the coverage.
import { PracticeHero } from '@/components/Deck/PracticeHero';
import { renderWithProviders } from '@/test/renderWithProviders';

function renderHero(props: Partial<React.ComponentProps<typeof PracticeHero>> = {}) {
  return renderWithProviders(
    <PracticeHero cardCount={10} onStudy={vi.fn()} onPractice={vi.fn()} {...props} />,
  );
}

describe('PracticeHero reading gate', () => {
  it('hides the Reading tile until the deck unlocks it', () => {
    renderHero();

    expect(screen.getByText('Match')).toBeInTheDocument();
    expect(screen.queryByText('Reading')).not.toBeInTheDocument();
  });

  it('shows the Reading tile once unlocked', () => {
    renderHero({ readingUnlocked: true });

    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('keeps the unlock control out of the practice grid', () => {
    renderHero({ readingUnlocked: true });

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
