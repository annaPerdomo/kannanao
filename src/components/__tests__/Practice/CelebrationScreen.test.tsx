import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Particle components are canvas/animation-heavy — replace with stubs
vi.mock('@/components/Practice/CelebrationScreen/Particles', () => ({
  ConfettiParticles: () => null,
  FireworkParticles: () => null,
  StarParticles: () => null,
  BubbleParticles: () => null,
  EmojiRainParticles: () => null,
  HeartParticles: () => null,
  BunnyParticles: () => null,
  SparkleParticles: () => null,
}));

vi.mock('@/hooks/useShop', () => ({
  useShop: () => ({ equipped: {} }),
  CELEBRATION_THEMES: {},
  CARD_BORDER_STYLES: {},
}));

import { CelebrationScreen } from '@/components/Practice/CelebrationScreen';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CelebrationScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the heading', () => {
    renderWithProviders(
      <CelebrationScreen
        heading="Perfect!"
        subheading="5 / 5 correct"
        mode="recall"
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText('Perfect!')).toBeInTheDocument();
  });

  it('should render the subheading', () => {
    renderWithProviders(
      <CelebrationScreen
        heading="Great job!"
        subheading="4 / 5 correct"
        mode="recall"
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText('4 / 5 correct')).toBeInTheDocument();
  });

  it('should render the extra text when provided', () => {
    renderWithProviders(
      <CelebrationScreen
        heading="Perfect!"
        subheading="5 / 5 correct"
        extra="🔥 Best streak: 5 in a row!"
        mode="recall"
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText('🔥 Best streak: 5 in a row!')).toBeInTheDocument();
  });

  it('should not render extra text when not provided', () => {
    renderWithProviders(
      <CelebrationScreen
        heading="Perfect!"
        subheading="5 / 5 correct"
        mode="recall"
        onExit={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Best streak/)).not.toBeInTheDocument();
  });

  it('should render a "Back to Deck" button', () => {
    renderWithProviders(
      <CelebrationScreen
        heading="Perfect!"
        subheading="5 / 5 correct"
        mode="recall"
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText('Back to Deck')).toBeInTheDocument();
  });

  it('should call onExit when "Back to Deck" is clicked', () => {
    const onExit = vi.fn();
    renderWithProviders(
      <CelebrationScreen
        heading="Perfect!"
        subheading="5 / 5 correct"
        mode="recall"
        onExit={onExit}
      />,
    );
    fireEvent.click(screen.getByText('Back to Deck'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('should render correctly for match mode heading', () => {
    renderWithProviders(
      <CelebrationScreen
        heading="All matched!"
        subheading="4 pairs · 1 round"
        mode="match"
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText('All matched!')).toBeInTheDocument();
    expect(screen.getByText('4 pairs · 1 round')).toBeInTheDocument();
  });

  it('should render correctly for fill mode', () => {
    renderWithProviders(
      <CelebrationScreen
        heading="Keep going!"
        subheading="3 / 5 correct"
        mode="fill"
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText('Keep going!')).toBeInTheDocument();
  });

  it('should render star decorations', () => {
    renderWithProviders(
      <CelebrationScreen
        heading="Perfect!"
        subheading="5 / 5 correct"
        mode="recall"
        onExit={vi.fn()}
      />,
    );
    // The ⭐ and ✨ stars are rendered as decoration
    const body = document.body.textContent ?? '';
    expect(body.includes('⭐') || body.includes('✨')).toBe(true);
  });

  it('should not throw with an equipped celebration item', () => {
    // Override useShop to return an equipped celebration
    vi.doMock('@/hooks/useShop', () => ({
      useShop: () => ({ equipped: { celebration: 'celeb_hearts' } }),
      CELEBRATION_THEMES: {
        celeb_hearts: { colors: ['#FF69B4'], emojis: ['💖'] },
      },
      CARD_BORDER_STYLES: {},
    }));

    expect(() =>
      renderWithProviders(
        <CelebrationScreen heading="Perfect!" subheading="5/5" mode="recall" onExit={vi.fn()} />,
      ),
    ).not.toThrow();
  });
});
