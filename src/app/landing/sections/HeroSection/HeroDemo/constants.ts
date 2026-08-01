import { DEMO_IMAGE_CARDS } from '../../demoData';

/** Exactly one grid row — a second row would be cropped mid-card. */
export const DEMO_CARDS = DEMO_IMAGE_CARDS.slice(0, 4);

/**
 * The words the educator types, derived from the cards they produce rather than
 * listed separately — so the demo can never show four words turning into four
 * unrelated cards.
 */
export const HERO_WORDS = DEMO_CARDS.map((card) => card.meaning);

/**
 * The single camera every surface is photographed through: `perspective` on the
 * wrapper, the rotation on the stage. Nothing below the stage may add its own
 * rotate. ~2400px on a ~660px subject is roughly a 50mm lens — distant objects
 * shrink a little, nothing bows.
 */
export const CAMERA = {
  perspective: 2400,
  /** Camera sits above the plane, looking down — the top edge recedes. */
  tiltX: 6,
  /**
   * Yaw about the vertical axis; negative brings the RIGHT edge toward the
   * camera. There is deliberately no roll — the diagonal across the window's top
   * edge is what rotateX ∘ rotateY produces, not a rotateZ. Adding one would
   * tilt the rectangle without changing which side is nearer.
   */
  turnY: -12,
  origin: '58% 45%',
  /** How far the phone floats toward the camera, in stage px. */
  phoneZ: 72,
  /**
   * Extra yaw for the phone ALONE, on top of `turnY`. Not a second camera — it
   * still projects through the one `perspective`, it is just an object turned
   * further than the window it leans on. Needed because apparent keystone scales
   * with on-screen width: the 170px phone shows roughly a quarter of the 660px
   * window's at the same angle.
   */
  phoneExtraYaw: -14,
} as const;

/**
 * Card width in deck-page pixels — what the real deck page gives a card at its
 * 4–5 column desktop layout. Fixed, never `1fr`: ImageCard's artwork is a fixed
 * 120px tall, so a stretched card goes flat and stops reading as a trading card.
 */
export const CARD_W = 240;
/** 240x360 keeps the trading-card proportion; the app's own 1:1.7 read as a column. */
export const CARD_H = 360;
// The deck page's layout width before it is scaled into the browser frame —
// sized so CARD_W tiles exactly 4 across.
export const DESK_W = 1060;
// Ends just below the single card row, so the fold has no half-sliced card.
export const DESK_CROP_H = 648;
// Rendered width of the browser frame; the scale factor falls out of it.
export const FRAME_W = { lg: 520, xl: 660 } as const;
export const FRAME_SCALE = { lg: FRAME_W.lg / DESK_W, xl: FRAME_W.xl / DESK_W } as const;
export const CHROME_H = 34;
export const FRAME_H = {
  lg: DESK_CROP_H * FRAME_SCALE.lg + CHROME_H,
  xl: DESK_CROP_H * FRAME_SCALE.xl + CHROME_H,
} as const;

// The phone hangs off the window's bottom edge, and that edge is the demo's
// lowest point — it has to clear the painted friends' heads, which sit at ~63%
// of the hero on the shortest viewports.
//
// `left` is the optical centre, not the geometric one: the plane is yawed, so
// the near (right) half of the window covers more screen width than the far
// half, and a phone at exactly 50% reads as sitting left of centre.
export const PHONE = {
  lg: { top: 214, left: 186, scale: 0.72 },
  xl: { top: 270, left: 263, scale: 0.9 },
} as const;
export const PHONE_CARD_SCALE = 0.62;
export const PHONE_CARD_W = 250 * PHONE_CARD_SCALE;
export const PHONE_CARD_H = 410 * PHONE_CARD_SCALE;
/** Fixed body height so swapping study card ⇄ practice never resizes the phone. */
export const PHONE_BODY_H = PHONE_CARD_H;

/**
 * The painted friends sit at a fixed FRACTION of the hero's height but the demo
 * is a fixed pixel stack, so below ~900px tall the phone's bottom edge lands on
 * their heads. Shrink the assembly instead — one transform on the camera, so the
 * projection is untouched.
 */
export const SHORT_VIEWPORT_SCALE = [
  { maxHeight: 1000, scale: 0.92 },
  { maxHeight: 900, scale: 0.82 },
  { maxHeight: 810, scale: 0.74 },
] as const;

/** Handset chrome + body, plus the "Learner view" tag hanging off its bottom corner. */
const PHONE_STACK_H = 330 + 24;

export const COLUMN_H = {
  lg: PHONE.lg.top + PHONE_STACK_H * PHONE.lg.scale,
  xl: PHONE.xl.top + PHONE_STACK_H * PHONE.xl.scale,
} as const;

export type DemoStage = 'typing' | 'generating' | 'cards' | 'practice';

/**
 * One frame per keystroke: `committed` words already sit in the input as chips,
 * `typing` is the partial word after the last chip. Precomputed so the ticker is
 * a plain index bump.
 */
export interface TypingFrame {
  committed: number;
  typing: string;
}

export function buildTypingFrames(words: string[]): TypingFrame[] {
  const frames: TypingFrame[] = [];
  words.forEach((word, i) => {
    for (let c = 1; c <= word.length; c++) frames.push({ committed: i, typing: word.slice(0, c) });
    // Two idle frames after each commit read as the pause before the next word.
    frames.push({ committed: i + 1, typing: '' }, { committed: i + 1, typing: '' });
  });
  return frames;
}

export const TYPING_FRAMES = buildTypingFrames(HERO_WORDS);
export const TYPE_TICK_MS = 55;

export const TIMELINE = {
  generating: 2600,
  cards: 4400,
  cardStagger: 260,
  // Only once the deck is full — it has to exist before a learner holds it.
  phoneIn: 5800,
  practice: 8200,
  answer: 9700,
  loop: 14500,
} as const;

/** Sentence Builder demo: the deck's own 桜 card, with its particle knocked out. */
export const DEMO_SENTENCE = {
  before: '{桜|さくら}',
  particle: 'が',
  after: '{綺麗|きれい}に{咲|さ}きました。',
  options: ['を', 'が', 'に'],
} as const;
