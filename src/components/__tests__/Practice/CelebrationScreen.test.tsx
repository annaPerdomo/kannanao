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

const shopState = vi.hoisted(() => ({ equipped: {} as Record<string, string> }));
vi.mock('@/contexts/ShopContext', () => ({
  useShopCtx: () => shopState,
}));

vi.mock('@/hooks/useShop', () => ({
  CELEBRATION_THEMES: {
    celeb_hearts: { colors: ['#FF69B4'], emojis: ['💖'] },
  },
  CARD_BORDER_STYLES: {},
}));

import {
  CelebrationScreen,
  pickPraise,
  PRAISE_GOOD,
  PRAISE_GREAT,
  PRAISE_PERFECT,
} from '@/components/Practice/CelebrationScreen';
import { QuestHandoffProvider } from '@/contexts/QuestHandoffContext';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('pickPraise', () => {
  it('draws a perfect-tier phrase for a full score', () => {
    expect(PRAISE_PERFECT).toContainEqual(pickPraise(1, 0));
    expect(pickPraise(1, 0)).toEqual(PRAISE_PERFECT[0]);
  });

  it('draws a great-tier phrase for 70%+', () => {
    expect(PRAISE_GREAT).toContainEqual(pickPraise(0.7, 3));
    expect(PRAISE_GREAT).toContainEqual(pickPraise(0.85, 1));
  });

  it('draws an encouraging phrase below 70%', () => {
    expect(PRAISE_GOOD).toContainEqual(pickPraise(0.5, 2));
    expect(PRAISE_GOOD).toContainEqual(pickPraise(0, 0));
  });

  it('rotates through the tier as the seed changes', () => {
    const picks = PRAISE_PERFECT.map((_, i) => pickPraise(1, i));
    expect(picks).toEqual(PRAISE_PERFECT);
  });

  it('is stable for a given seed (no flicker across re-renders)', () => {
    expect(pickPraise(1, 7)).toEqual(pickPraise(1, 7));
  });
});

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

  it('renders a Japanese heading with its furigana reading and English gloss', () => {
    renderWithProviders(
      <CelebrationScreen
        heading="{完璧|かんぺき}！"
        headingEn="Perfect!"
        subheading="5 / 5 correct"
        mode="recall"
        onExit={vi.fn()}
      />,
    );
    const body = document.body.textContent ?? '';
    // Kanji, its ruby reading, and the English translation all appear so every
    // level can read it.
    expect(body).toContain('完璧');
    expect(body).toContain('かんぺき');
    expect(screen.getByText('Perfect!')).toBeInTheDocument();
  });

  it('uses a custom exit label when given', () => {
    renderWithProviders(
      <CelebrationScreen
        heading="Done!"
        subheading="cleared"
        mode="study"
        exitLabel="Back to Review"
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText('Back to Review')).toBeInTheDocument();
  });

  it('shows the daily chest and awards it once on tap', () => {
    const onOpen = vi.fn();
    renderWithProviders(
      <CelebrationScreen
        heading="Done!"
        subheading="cleared"
        mode="study"
        chest={{ variant: 'gold', xp: 100, onOpen }}
        onExit={vi.fn()}
      />,
    );
    const chest = screen.getByRole('button', { name: /open your daily chest/i });
    fireEvent.click(chest);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByText('+100 XP!')).toBeInTheDocument();
    // Tapping the opened chest again does nothing.
    fireEvent.click(screen.getByRole('button', { name: /chest opened/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('renders no chest when none is provided', () => {
    renderWithProviders(
      <CelebrationScreen heading="Done!" subheading="cleared" mode="study" onExit={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /daily chest/i })).not.toBeInTheDocument();
  });

  it('should not throw with an equipped celebration item', () => {
    shopState.equipped = { celebration: 'celeb_hearts' };
    try {
      expect(() =>
        renderWithProviders(
          <CelebrationScreen heading="Perfect!" subheading="5/5" mode="recall" onExit={vi.fn()} />,
        ),
      ).not.toThrow();
    } finally {
      shopState.equipped = {};
    }
  });
});

describe('CelebrationScreen inside an assignment quest', () => {
  it("replaces the exit button with the quest's one next step", () => {
    const onNext = vi.fn();
    const onExit = vi.fn();
    renderWithProviders(
      <QuestHandoffProvider value={{ label: 'Next: Practice', onNext }}>
        <CelebrationScreen
          heading="Done!"
          subheading="cleared"
          mode="study"
          exitLabel="Back to Deck"
          onExit={onExit}
        />
      </QuestHandoffProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Back to Deck' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Practice' }));
    expect(onNext).toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });
});
