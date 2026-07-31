import { describe, expect, it } from 'vitest';

import { UserAvatar } from '@/components/UserAvatar';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('UserAvatar', () => {
  it('renders the buddy face for a valid avatar value', () => {
    const { container } = renderWithProviders(<UserAvatar avatar="buddy_fox:3" name="Hana" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/buddies/faces/fox-3.webp');
  });

  it('falls back to the name initial without an avatar', () => {
    const { container } = renderWithProviders(<UserAvatar name="hana" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('H');
  });

  it('falls back to the initial when the stored value no longer resolves', () => {
    const { container } = renderWithProviders(<UserAvatar avatar="buddy_retired:3" name="Hana" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('H');
  });

  it('prefers an explicit fallback over the initial', () => {
    const { container } = renderWithProviders(<UserAvatar name="Hana" fallback="Me" />);
    expect(container).toHaveTextContent('Me');
  });

  it('shows ? for an empty name', () => {
    const { container } = renderWithProviders(<UserAvatar name="  " />);
    expect(container).toHaveTextContent('?');
  });
});
