export type PracticeMode = 'match' | 'fill' | 'recall' | 'study' | 'speech_read' | 'speech_recall';
export type CelebTheme = 'confetti' | 'fireworks' | 'stars' | 'bubbles' | 'emojiRain' | 'hearts' | 'bunnies' | 'sparkle';

export interface ThemeConfig {
  bg: string;
  emoji: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  subTextColor: string;
  btnBg: string;
  btnText: string;
}

export const CONFETTI_COLORS = [
  '#ff6b9d', '#ff9f43', '#ffd32a', '#0be881', '#18dcff',
  '#a29bfe', '#fd79a8', '#fdcb6e', '#55efc4', '#74b9ff',
];

export const FIREWORK_COLORS = [
  '#ff0080', '#00ffff', '#ff9900', '#00ff41',
  '#ff3366', '#ffcc00', '#cc00ff', '#ff6600',
];

export const BUBBLE_COLORS = [
  'rgba(255,182,193,0.55)',
  'rgba(173,216,230,0.55)',
  'rgba(221,160,221,0.55)',
  'rgba(144,238,144,0.55)',
  'rgba(255,255,180,0.65)',
  'rgba(230,230,250,0.65)',
];

export const HEART_COLORS = [
  '#FF1493', '#FF69B4', '#FFB6C1', '#FF4D94', '#FF85A2',
  '#E91E63', '#F48FB1', '#FF6090', '#FF80AB', '#F50057',
];

export const SPARKLE_COLORS = [
  '#FF69B4', '#FF1493', '#C084FC', '#F472B6', '#FB7185',
  '#E879F9', '#F0ABFC', '#D946EF', '#A855F7', '#EC4899',
];

export const MODE_EMOJIS: Record<PracticeMode, string[]> = {
  recall:        ['🌟', '✨', '💫', '⭐', '🎯', '🏆'],
  fill:          ['✏️', '📝', '🌸', '💐', '✨', '🎨'],
  match:         ['🎯', '🎊', '🎉', '🎈', '⭐', '🔗'],
  study:         ['📚', '🌸', '✨', '💫', '🦋', '⭐'],
  speech_read:   ['🎤', '🌸', '✨', '📖', '🌟', '🎀'],
  speech_recall: ['🎤', '🌟', '💪', '⭐', '🎯', '✨'],
};

export const THEME_CONFIGS: Record<CelebTheme, ThemeConfig> = {
  confetti: {
    bg: 'radial-gradient(ellipse at 60% 30%, #3d1e6e 0%, #1a0a3e 55%, #0d0624 100%)',
    emoji: '🎊',
    cardBg: 'rgba(255,255,255,0.09)',
    cardBorder: 'rgba(255,255,255,0.2)',
    textColor: '#ffffff',
    subTextColor: 'rgba(255,255,255,0.72)',
    btnBg: '#ff6b9d',
    btnText: '#fff',
  },
  fireworks: {
    bg: 'radial-gradient(ellipse at 50% 60%, #001233 0%, #000d1f 60%, #000508 100%)',
    emoji: '🎆',
    cardBg: 'rgba(255,255,255,0.07)',
    cardBorder: 'rgba(255,255,255,0.14)',
    textColor: '#ffffff',
    subTextColor: 'rgba(255,255,255,0.68)',
    btnBg: '#00e5ff',
    btnText: '#001233',
  },
  stars: {
    bg: 'linear-gradient(160deg, #0d0d2b 0%, #0d1b4b 50%, #1a2a6c 100%)',
    emoji: '⭐',
    cardBg: 'rgba(255,255,255,0.09)',
    cardBorder: 'rgba(255,215,0,0.28)',
    textColor: '#ffffff',
    subTextColor: 'rgba(255,255,255,0.72)',
    btnBg: '#ffd700',
    btnText: '#1a1000',
  },
  bubbles: {
    bg: 'linear-gradient(135deg, #c8e6fa 0%, #e8d5f5 55%, #fde8f0 100%)',
    emoji: '🎈',
    cardBg: 'rgba(255,255,255,0.72)',
    cardBorder: 'rgba(255,255,255,0.92)',
    textColor: '#2d1b69',
    subTextColor: 'rgba(45,27,105,0.65)',
    btnBg: '#7c3aed',
    btnText: '#fff',
  },
  emojiRain: {
    bg: 'linear-gradient(145deg, #1a0533 0%, #3d0f6e 35%, #6b1a8a 70%, #a63a6e 100%)',
    emoji: '🌟',
    cardBg: 'rgba(255,255,255,0.09)',
    cardBorder: 'rgba(255,255,255,0.2)',
    textColor: '#ffffff',
    subTextColor: 'rgba(255,255,255,0.72)',
    btnBg: '#ff6e40',
    btnText: '#fff',
  },
  hearts: {
    bg: 'radial-gradient(ellipse at 50% 40%, #4a0028 0%, #2d0016 40%, #1a000d 100%)',
    emoji: '💖',
    cardBg: 'rgba(255,255,255,0.08)',
    cardBorder: 'rgba(255,105,180,0.3)',
    textColor: '#ffffff',
    subTextColor: 'rgba(255,255,255,0.72)',
    btnBg: '#FF69B4',
    btnText: '#fff',
  },
  bunnies: {
    bg: 'linear-gradient(145deg, #fce4ec 0%, #f8bbd0 30%, #f48fb1 70%, #ec407a 100%)',
    emoji: '🐰',
    cardBg: 'rgba(255,255,255,0.7)',
    cardBorder: 'rgba(255,255,255,0.9)',
    textColor: '#880e4f',
    subTextColor: 'rgba(136,14,79,0.65)',
    btnBg: '#ec407a',
    btnText: '#fff',
  },
  sparkle: {
    bg: 'radial-gradient(ellipse at 40% 30%, #2d004d 0%, #1a0033 45%, #0d001a 100%)',
    emoji: '✨',
    cardBg: 'rgba(255,255,255,0.08)',
    cardBorder: 'rgba(244,114,182,0.3)',
    textColor: '#ffffff',
    subTextColor: 'rgba(255,255,255,0.72)',
    btnBg: '#E879F9',
    btnText: '#fff',
  },
};

export const ALL_THEMES: CelebTheme[] = ['confetti', 'fireworks', 'stars', 'bubbles', 'emojiRain', 'hearts', 'bunnies', 'sparkle'];

export const CELEBRATION_KEY_TO_THEME: Record<string, CelebTheme> = {
  celeb_hearts:       'hearts',
  celeb_stars:        'stars',
  celeb_bunnies:      'bunnies',
  celeb_rainbow:      'confetti',
  celeb_sparkle_pink: 'sparkle',
  celeb_galaxy:       'fireworks',
};

export const CELEB_PARTICLE_BG: Record<string, string> = {
  confetti:  'radial-gradient(ellipse at 60% 30%, #3d1e6e 0%, #1a0a3e 55%, #0d0624 100%)',
  fireworks: 'radial-gradient(ellipse at 50% 60%, #001233 0%, #000d1f 60%, #000508 100%)',
  stars:     'linear-gradient(160deg, #0d0d2b 0%, #0d1b4b 50%, #1a2a6c 100%)',
  bubbles:   'linear-gradient(135deg, #c8e6fa 0%, #e8d5f5 55%, #fde8f0 100%)',
  emojiRain: 'linear-gradient(145deg, #1a0533 0%, #3d0f6e 35%, #6b1a8a 70%, #a63a6e 100%)',
  hearts:    'radial-gradient(ellipse at 50% 40%, #4a0028 0%, #2d0016 40%, #1a000d 100%)',
  bunnies:   'linear-gradient(145deg, #fce4ec 0%, #f8bbd0 30%, #f48fb1 70%, #ec407a 100%)',
  sparkle:   'radial-gradient(ellipse at 40% 30%, #2d004d 0%, #1a0033 45%, #0d001a 100%)',
};
