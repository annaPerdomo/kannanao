import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Direct import, not the barrel: pulling in DeckHeader & friends would only
// slow this suite down and muddy its coverage.
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
    renderHero({ readingUnlocked: true, readingCardCount: 6 });

    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('shows no unlock switch to a learner', () => {
    renderHero({ readingUnlocked: false, readingCardCount: 6 });

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByText('Kanji reading practice')).not.toBeInTheDocument();
  });

  it('lets the owner unlock reading practice', () => {
    const onToggleReading = vi.fn();
    renderHero({ readingCardCount: 6, onToggleReading });

    expect(screen.getByText('Kanji reading practice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch'));

    expect(onToggleReading).toHaveBeenCalledWith(true);
  });

  it('lets the owner lock it again', () => {
    const onToggleReading = vi.fn();
    renderHero({ readingUnlocked: true, readingCardCount: 6, onToggleReading });

    fireEvent.click(screen.getByRole('switch'));

    expect(onToggleReading).toHaveBeenCalledWith(false);
  });

  it('disables the switch when the deck has no kanji words', () => {
    renderHero({ readingCardCount: 0, onToggleReading: vi.fn() });

    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByText('This deck has no kanji words yet')).toBeInTheDocument();
  });
});
