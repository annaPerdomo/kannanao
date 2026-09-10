import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReadingSection } from '@/components/Group/MemberDetail/ReadingSection';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { MemberReading, TrackReading } from '@/types/reading';

function emptyTrack(): TrackReading {
  return { stage: 'new', known: 0, total: 46, seen: 0, characters: [] };
}

function trackWithChars(): TrackReading {
  return {
    stage: 'learning',
    known: 5,
    total: 46,
    seen: 10,
    characters: [
      { kana: 'あ', stars: 3, state: 'solid' },
      { kana: 'い', stars: 0, state: 'new' },
    ],
  };
}

function makeReading(overrides: Partial<MemberReading> = {}): MemberReading {
  return {
    hiragana: emptyTrack(),
    katakana: emptyTrack(),
    lastPracticedAt: null,
    ...overrides,
  };
}

describe('ReadingSection', () => {
  it('renders the not-started line when neither track has been seen', () => {
    renderWithProviders(<ReadingSection reading={makeReading()} />);
    expect(screen.getByText("Hasn't started reading practice yet.")).toBeInTheDocument();
    expect(screen.queryByText('Hiragana')).not.toBeInTheDocument();
  });

  it('renders the known count and stage for a track with activity', () => {
    renderWithProviders(<ReadingSection reading={makeReading({ hiragana: trackWithChars() })} />);
    expect(screen.getByText('Hiragana')).toBeInTheDocument();
    expect(screen.getByText('Learning')).toBeInTheDocument();
    expect(screen.getByText('5 of 46 characters')).toBeInTheDocument();
    expect(screen.queryByText('Katakana')).not.toBeInTheDocument();
  });

  it('shows the last-practised date when set', () => {
    renderWithProviders(
      <ReadingSection
        reading={makeReading({
          hiragana: trackWithChars(),
          lastPracticedAt: '2026-08-15T00:00:00Z',
        })}
      />,
    );
    expect(screen.getByText(/Last practised/)).toBeInTheDocument();
  });

  it('toggles the character grid and reveals chips with the right aria labels', () => {
    renderWithProviders(<ReadingSection reading={makeReading({ hiragana: trackWithChars() })} />);

    expect(screen.queryByLabelText('あ, 3 of 3 stars')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show characters' }));

    expect(screen.getByLabelText('あ, 3 of 3 stars')).toBeInTheDocument();
    expect(screen.getByLabelText('い, 0 of 3 stars')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide characters' }));
    expect(screen.queryByLabelText('あ, 3 of 3 stars')).not.toBeInTheDocument();
  });
});
