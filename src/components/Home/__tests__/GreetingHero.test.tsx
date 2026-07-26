import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GreetingHero } from '@/components/Home';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('GreetingHero', () => {
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

  // The mascot artwork carries no information the greeting doesn't, so it must
  // stay out of the accessibility tree rather than announce a filename.
  it('should expose the mascot artwork as decorative', () => {
    const { container } = renderWithProviders(<GreetingHero greeting="Good evening, Anna!" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
