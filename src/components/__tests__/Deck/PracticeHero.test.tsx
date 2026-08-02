import { fireEvent, screen } from '@testing-library/react';
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

describe('PracticeHero mixed practice', () => {
  it('demotes the games behind a disclosure once mixed practice is offered', () => {
    renderHero({ onMixedPractice: vi.fn() });

    expect(screen.getByLabelText('Start mixed practice')).toBeInTheDocument();
    expect(screen.queryByText('Match')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'More games' }));
    expect(screen.getByText('Match')).toBeInTheDocument();
  });

  it('starts a session on tap', () => {
    const onMixedPractice = vi.fn();
    renderHero({ onMixedPractice });

    fireEvent.click(screen.getByLabelText('Start mixed practice'));
    expect(onMixedPractice).toHaveBeenCalledTimes(1);
  });

  // Two sessions from one impatient double-tap would leave the second plan
  // overwriting the first mid-navigation.
  it('ignores taps while the session is being planned', () => {
    const onMixedPractice = vi.fn();
    renderHero({ onMixedPractice, mixedStarting: true });

    fireEvent.click(screen.getByLabelText('Start mixed practice'));
    expect(onMixedPractice).not.toHaveBeenCalled();
  });

  it('leaves the grid open on a deck too small for a mix', () => {
    renderHero({ cardCount: 1, onMixedPractice: vi.fn() });

    expect(screen.queryByLabelText('Start mixed practice')).not.toBeInTheDocument();
    expect(screen.getByText('Match')).toBeInTheDocument();
  });
});
