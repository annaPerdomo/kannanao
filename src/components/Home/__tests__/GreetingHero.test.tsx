import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GreetingHero } from '@/components/Home';
import { renderWithProviders } from '@/test/renderWithProviders';

/** Freeze the clock at a local hour so the banner choice is deterministic. */
function atHour(hour: number) {
  vi.setSystemTime(new Date(2026, 6, 26, hour, 0, 0));
}

describe('GreetingHero', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    atHour(20);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render the greeting it is given', () => {
    renderWithProviders(<GreetingHero greeting="Good evening, Anna!" />);
    expect(screen.getByText('Good evening, Anna!')).toBeInTheDocument();
  });

  it('should render its call to action', () => {
    renderWithProviders(
      <GreetingHero greeting="Good evening, Anna!">
        <button type="button">Review</button>
      </GreetingHero>,
    );
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
  });

  it('should render the aside beside the greeting', () => {
    renderWithProviders(
      <GreetingHero greeting="Good evening, Anna!" aside={<span>XP Progress</span>} />,
    );
    expect(screen.getByText('XP Progress')).toBeInTheDocument();
  });

  // The banner artwork carries no information the greeting doesn't, so it must
  // stay out of the accessibility tree rather than announce a filename.
  it('should expose the banner artwork as decorative', () => {
    const { container } = renderWithProviders(<GreetingHero greeting="Good evening, Anna!" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  // Two shapes of the same scene: the <img> is the phone card and the <source>
  // is the wide band the overlay layout needs. Getting these crossed would put a
  // 5:1 strip in a 1.4:1 slot, so both are pinned.
  it.each([
    [8, 'hero-morning'],
    [14, 'hero-afternoon'],
    [20, 'hero-evening'],
  ])('should show the %i:00 banner in both shapes', (hour, slug) => {
    atHour(hour);
    const { container } = renderWithProviders(<GreetingHero greeting="Hi" />);
    expect(container.querySelector('img')).toHaveAttribute('src', `/mascot/${slug}-mobile.webp`);
    // Both densities of the band, so a retina screen gets the pre-sharpened
    // enlargement instead of the browser's own soft upscale.
    expect(container.querySelector('source')).toHaveAttribute(
      'srcset',
      `/mascot/${slug}.webp 1x, /mascot/${slug}@2x.webp 2x`,
    );
  });

  // The chip is a stack of ruby fragments, which reads as gibberish out loud —
  // the <time> element's own label is what a screen reader should get instead.
  // It has to say "today" too: a bare date could be a deadline or a filter.
  it("should label today's date in plain language", () => {
    renderWithProviders(<GreetingHero greeting="Hi" />);
    expect(screen.getByLabelText('Today, July 26, 2026')).toBeInTheDocument();
  });

  it('should mark the date as today on screen as well', () => {
    renderWithProviders(<GreetingHero greeting="Hi" />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it("should write today's date in Japanese with its readings", () => {
    renderWithProviders(<GreetingHero greeting="Hi" />);
    expect(screen.getByText('しちがつ')).toBeInTheDocument();
    expect(screen.getByText('にじゅうろくにち')).toBeInTheDocument();
    expect(screen.getByText('にち')).toBeInTheDocument();
  });
});
