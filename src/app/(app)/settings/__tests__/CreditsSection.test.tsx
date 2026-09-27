import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { CreditsSection } from '../CreditsSection';

describe('CreditsSection', () => {
  it('renders the credits title', () => {
    renderWithProviders(<CreditsSection />);
    expect(screen.getByText('Credits')).toBeInTheDocument();
  });

  it('links KANJIDIC2, EDRDG, the licence and Unsplash to the right pages', () => {
    renderWithProviders(<CreditsSection />);

    const kanjidic = screen.getByRole('link', { name: 'KANJIDIC2' });
    expect(kanjidic).toHaveAttribute(
      'href',
      'https://www.edrdg.org/wiki/index.php/KANJIDIC_Project',
    );
    expect(kanjidic).toHaveAttribute('target', '_blank');

    const edrdg = screen.getByRole('link', {
      name: 'Electronic Dictionary Research and Development Group',
    });
    expect(edrdg).toHaveAttribute('href', 'https://www.edrdg.org/');
    expect(edrdg).toHaveAttribute('target', '_blank');

    const licence = screen.getByRole('link', {
      name: 'Creative Commons Attribution-ShareAlike 4.0 licence',
    });
    expect(licence).toHaveAttribute('href', 'https://www.edrdg.org/edrdg/licence.html');
    expect(licence).toHaveAttribute('target', '_blank');

    const unsplash = screen.getByRole('link', { name: 'Unsplash' });
    expect(unsplash).toHaveAttribute(
      'href',
      'https://unsplash.com/?utm_source=tangodachi&utm_medium=referral',
    );
    expect(unsplash).toHaveAttribute('target', '_blank');
  });
});
