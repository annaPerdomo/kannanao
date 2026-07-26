'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

import { resolveTimeOfDay, type TimeOfDay } from '@/lib/timeOfDay';

import { HeroDateChip } from './HeroDateChip';

/**
 * The banner art for each greeting slot, in both shapes.
 *
 * The wide band is the overlay layout's background; the card is what the phone
 * shows whole. Both sets are normalised to one aspect per set by
 * scripts/extract-hero-banners.py, which is what lets the hero size itself from
 * the art instead of cropping to a guessed height.
 *
 * The band ships at two densities because it is the one asset the hero enlarges:
 * ~1400px of artwork stretched across 2560 device pixels on a retina screen. The
 * `@2x` file is that enlargement done properly (Lanczos + unsharp, in the
 * script) rather than left to the browser's bilinear filter, which softens the
 * mascot's ink outlines to mush. The cards need no second density — they are
 * already ~2x for a phone-sized slot.
 *
 * Sliced from promo/tango-greetings-2-different-times-of-day.png (wide) and
 * promo/tango-banner-full-size-mobile.png (cards).
 */
const BANNERS: Record<TimeOfDay, { band: string; card: string; emoji: string }> = {
  morning: { band: 'hero-morning', card: 'hero-morning-mobile', emoji: '☀️' },
  afternoon: { band: 'hero-afternoon', card: 'hero-afternoon-mobile', emoji: '🌤️' },
  evening: { band: 'hero-evening', card: 'hero-evening-mobile', emoji: '🌙' },
};

const art = (name: string) => `/mascot/${name}.webp`;
/** Density-descriptor srcset, so only retina screens pay for the @2x file. */
const bandSrcSet = (name: string) => `${art(name)} 1x, ${art(`${name}@2x`)} 2x`;

/** Aspect ratios the extraction script normalises each set to. */
const WIDE_ASPECT = 4.764;
const CARD_ASPECT = 1.363;

/**
 * `object-position` X for the wide band while it is being cropped.
 *
 * Left of the band's own centre, which walks the mascot to the *right* — it
 * lands around 70% of the banner on a small tablet and drifts back toward the
 * middle as more of the illustration is revealed, staying clear of the copy the
 * whole way. All three bands share one value because they share one aspect.
 * Above `UNCROPPED_FROM` there is no crop and this has no effect.
 */
const CROP_FOCUS_X = 35;

/**
 * How the wide banner gets its height, in two regimes.
 *
 * A 5:1 band is shorter than the greeting and its button need until the page is
 * quite wide, so below `UNCROPPED_FROM` the height is a flat floor and the
 * band's sides crop to fill it (`CROP_FOCUS_X` keeps the mascot in frame while they
 * do). At and above it the band's own aspect finally clears the copy, so the
 * banner takes that aspect exactly and the whole illustration is on screen.
 *
 * `UNCROPPED_FROM` is where `width / WIDE_ASPECT` first exceeds the widest floor
 * — pick a smaller number and the hero visibly *shrinks* as the window grows.
 *
 * The two must never both apply to the same box: `aspect-ratio` transfers a
 * `min-height` into an equivalent `min-width` (CSS Sizing 4), which at this
 * ratio is a 1140px floor on the banner's *width* — it would burst straight out
 * of a phone-sized viewport. Hence `minHeight: 0` alongside the aspect.
 */
const WIDE_MIN_HEIGHT = { sm: 232, md: 240 };
const UNCROPPED_FROM = '@media (min-width:1240px)';

/**
 * Ceiling on the banner's width, and therefore on its height.
 *
 * Showing the whole illustration means height is width ÷ WIDE_ASPECT, so the
 * only way to make an uncropped banner shorter is to stop letting it get wider.
 * This caps it at 269px tall.
 *
 * It also caps how far the art is enlarged. The source bands are only ~290px
 * tall, so every pixel past their native size is invented — run the banner the
 * full 1600px of the dashboard and the upscale is visible as mush. A taller
 * source sheet is the only real fix; until then this is the limit.
 */
const HERO_MAX_WIDTH = 1280;

/**
 * The width the composition flips at, stated twice on purpose: once as a media
 * query for <source>, once as the MUI breakpoint the sx blocks key off. They are
 * the same 600px, and they have to stay the same — if <source> switched to the
 * wide band at a width where the layout still expected the card, the phone
 * composition would render a 5:1 strip in a 1.4:1 slot.
 */
const OVERLAY_MEDIA = '(min-width:600px)';
const OVERLAY_FROM = 'sm';

/**
 * Deep plum, held outside the theme on purpose. The three banners are painted
 * illustrations with their own light — sunrise gold, midday blue, dusk violet —
 * and the scrim's job is to be the shadow they all cast, whichever of the ten
 * colour schemes the user is running. A brand-tinted scrim would fight the art
 * in at least half of them.
 */
const SCRIM = '72, 26, 84';

/**
 * Width the aside (the XP card) is allowed to float over the banner at.
 *
 * Below this it stacks underneath instead: the copy needs ~400px, the mascot
 * owns the middle, and a 290px card on top of that leaves the three of them
 * fighting over the same pixels.
 */
const ASIDE_FLOATS_FROM = '@media (min-width:1040px)';
const ASIDE_WIDTH = 290;

interface GreetingHeroProps {
  /**
   * Time-of-day greeting, already interpolated with the user's name. A node
   * rather than a string because the caller marks the run that must not wrap.
   */
  greeting: React.ReactNode;
  /** Call to action rendered under the greeting — the Review tile. */
  children?: React.ReactNode;
  /** The XP card: floated over the banner's right edge on wide screens. */
  aside?: React.ReactNode;
}

/**
 * The home dashboard's hero: a wide illustration of the Tangodachi mascot at the
 * current time of day, carrying the greeting, today's date in Japanese, and the
 * day's single call to action.
 *
 * Two compositions, because one picture can't be both. From `sm` up the wide
 * band is the background and the copy sits on it, over a scrim. On phones the
 * near-square card is shown whole with the copy beneath it on the brand
 * gradient: at 360px the card is only ~260px tall and the mascot's face fills
 * the middle of it, so anything laid over the art would either cover the face or
 * demand a crop that loses half the scene.
 *
 * The artwork and the date chip wait for mount before they appear. Both depend
 * on the reader's clock, and the server renders this page too — resolving them
 * during SSR would pick the *server's* timezone and then contradict itself on
 * hydration. They fade in instead, over a brand gradient that stands in for the
 * sky, so the greeting is never held back by them.
 */
export function GreetingHero({ greeting, children, aside }: GreetingHeroProps) {
  const { palette, radii, breakpoints } = useTheme();
  const { brand, accent } = palette;
  const overlay = breakpoints.up(OVERLAY_FROM);

  // Deliberately not seeded from `new Date()` — see the note above.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  const banner = now ? BANNERS[resolveTimeOfDay(now)] : null;

  return (
    <Box sx={{ position: 'relative', maxWidth: HERO_MAX_WIDTH, mx: 'auto' }}>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          // See WIDE_MIN_HEIGHT: a flat floor while the band is shorter than the
          // copy, the band's own aspect once it isn't.
          [overlay]: { minHeight: WIDE_MIN_HEIGHT.sm, justifyContent: 'center' },
          [breakpoints.up('md')]: { minHeight: WIDE_MIN_HEIGHT.md },
          [UNCROPPED_FROM]: { minHeight: 0, aspectRatio: String(WIDE_ASPECT) },
          overflow: 'hidden',
          borderRadius: radii.md,
          background: `linear-gradient(135deg, ${brand[600]} 0%, ${accent[700]} 100%)`,
          boxShadow: `0 14px 40px ${alpha(brand[900], 0.28)}`,
        }}
      >
        {/* Decorative — the greeting and the date chip carry the meaning. In the
            phone composition this is a block in the flow at the card's own
            aspect, so none of it is cropped; from sm up it becomes the layer
            behind the copy. */}
        {banner && (
          <Box
            component="picture"
            sx={{
              display: 'block',
              flexShrink: 0,
              [overlay]: { position: 'absolute', inset: 0 },
              animation: 'heroFade 0.45s ease-out',
              '@keyframes heroFade': { from: { opacity: 0 }, to: { opacity: 1 } },
            }}
          >
            <source media={OVERLAY_MEDIA} srcSet={bandSrcSet(banner.band)} />
            <Box
              component="img"
              src={art(banner.card)}
              alt=""
              aria-hidden
              sx={{
                display: 'block',
                width: '100%',
                aspectRatio: String(CARD_ASPECT),
                objectFit: 'cover',
                [overlay]: {
                  height: '100%',
                  aspectRatio: 'auto',
                  objectPosition: `${CROP_FOCUS_X}% 50%`,
                },
              }}
            />
          </Box>
        )}

        {/* Scrim, for the overlay composition only. Dense across the copy's
            column — the sunrise banner puts the sun itself right where the
            greeting starts, and white type has to clear 3:1 against it — then
            falling away before the mascot so the artwork isn't muddied. The
            phone composition needs none of this: its copy is on the gradient. */}
        <Box
          aria-hidden
          sx={{
            display: 'none',
            [overlay]: {
              display: 'block',
              position: 'absolute',
              inset: 0,
              // Percentage stops while the band is cropped: the copy's column
              // is a percentage too, so they stay in step as the crop tightens.
              background: `linear-gradient(90deg, rgba(${SCRIM},0.86) 0%, rgba(${SCRIM},0.84) 30%, rgba(${SCRIM},0.6) 46%, rgba(${SCRIM},0.16) 60%, rgba(${SCRIM},0) 74%)`,
            },
            // Once nothing is cropped the copy stops growing with the page, so
            // the scrim stops in pixels too — otherwise a 1600px banner drags
            // the shadow out over the mascot it is supposed to clear.
            [UNCROPPED_FROM]: {
              background: `linear-gradient(90deg, rgba(${SCRIM},0.86) 0px, rgba(${SCRIM},0.84) 380px, rgba(${SCRIM},0.5) 560px, rgba(${SCRIM},0.12) 740px, rgba(${SCRIM},0) 900px)`,
            },
          }}
        />

        {now && <HeroDateChip date={now} />}

        <Box
          sx={{
            position: 'relative',
            width: '100%',
            // Capped short of the mascot: this is also the column the scrim is
            // dense across, so copy must not run past it. A percentage while the
            // banner crops, then a fixed width — past ~1340px the extra room
            // belongs to the illustration, not to a wider line of text.
            maxWidth: { xs: '100%', sm: '48%', md: '44%' },
            [UNCROPPED_FROM]: { maxWidth: 540 },
            px: { xs: 2.5, sm: 4 },
            py: { xs: 3, sm: 3.5 },
            // The phone composition puts the copy under the picture rather than
            // on it, so it needs its own ground. Plum rather than a brand
            // gradient: it has to sit under sunrise gold, midday blue and dusk
            // violet in turn without arguing with any of them.
            background: `linear-gradient(135deg, rgba(${SCRIM},1) 0%, rgba(56, 20, 66, 1) 100%)`,
            [overlay]: { background: 'none' },
          }}
        >
          {/* lang="ja" because the greeting is Japanese in every locale — Tango
              speaks Japanese, and this is the one line of it every reader sees
              every day. Without the attribute a screen reader would try to
              pronounce おはよう with an English voice. */}
          <Typography
            variant="h4"
            lang="ja"
            sx={{
              fontWeight: 800,
              lineHeight: 1.25,
              // Stepped down on phones: at the stock h4 size a two-word name
              // takes the greeting to three lines on a 320px screen.
              fontSize: { xs: '1.6rem', sm: '1.9rem', md: '2.125rem' },
              // Japanese would otherwise break between any two kana. Together
              // with the caller's nowrap run this leaves the 、as the only
              // break point, which is where a reader would break it too.
              wordBreak: 'keep-all',
              color: '#fff',
              textShadow: `0 2px 16px rgba(${SCRIM},0.6), 0 1px 3px rgba(${SCRIM},0.5)`,
            }}
          >
            {greeting}
            {/* Non-breaking space, so a narrow column wraps the greeting rather
                than orphaning the emoji on a line of its own. */}
            {banner && <span aria-hidden>{` ${banner.emoji}`}</span>}
          </Typography>

          {children && <Box sx={{ mt: { xs: 2, sm: 2.5 } }}>{children}</Box>}
        </Box>
      </Box>

      {aside && (
        <Box
          sx={{
            mt: 1.75,
            [ASIDE_FLOATS_FROM]: {
              position: 'absolute',
              zIndex: 3,
              top: '50%',
              right: 18,
              transform: 'translateY(-50%)',
              width: ASIDE_WIDTH,
              mt: 0,
            },
          }}
        >
          {aside}
        </Box>
      )}
    </Box>
  );
}
