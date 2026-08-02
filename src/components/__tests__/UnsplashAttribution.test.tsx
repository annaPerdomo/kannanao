import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import { encodeUnsplashUrl } from '@/services/api';
import { renderWithProviders } from '@/test/renderWithProviders';

const ATTRIBUTED_URL = encodeUnsplashUrl({
  url: 'https://images.unsplash.com/photo-123?w=400',
  downloadLocation: 'https://api.unsplash.com/photos/abc/download',
  photographerName: 'Hu Chen',
  photographerUrl: 'https://unsplash.com/@huchenme?utm_source=tangodachi&utm_medium=referral',
  photoPageUrl: 'https://unsplash.com/photos/abc?utm_source=tangodachi&utm_medium=referral',
});

describe('UnsplashAttribution', () => {
  it('credits and links both the photographer and Unsplash', () => {
    renderWithProviders(<UnsplashAttribution url={ATTRIBUTED_URL} />);

    expect(screen.getByRole('link', { name: 'Hu Chen' })).toHaveAttribute(
      'href',
      'https://unsplash.com/@huchenme?utm_source=tangodachi&utm_medium=referral',
    );
    expect(screen.getByRole('link', { name: 'Unsplash' })).toHaveAttribute(
      'href',
      'https://unsplash.com/photos/abc?utm_source=tangodachi&utm_medium=referral',
    );
  });

  it('credits the same way in the caption variant', () => {
    renderWithProviders(<UnsplashAttribution url={ATTRIBUTED_URL} variant="caption" />);

    expect(screen.getByRole('link', { name: 'Hu Chen' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unsplash' })).toBeInTheDocument();
  });

  it('renders nothing for a picture that did not come from Unsplash', () => {
    const { container } = renderWithProviders(
      <UnsplashAttribution url="https://storage.example.com/upload.png" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
