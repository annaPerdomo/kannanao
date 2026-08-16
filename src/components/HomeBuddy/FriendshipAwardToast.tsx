'use client';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import visuallyHidden from '@mui/utils/visuallyHidden';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { awardLine, awardWordLine, fillWordSlot } from '@/lib/buddyPhrases';
import type { BuddyWord } from '@/lib/buddyWords';
import { type FriendshipSource } from '@/lib/friendship';
import { isSessionRoute } from '@/lib/sessionRoutes';

import { awardFade, awardLineIn, heartLand } from './animations';

const VISIBLE_MS = 2500;
const LINE_HALF_WIDTH = 120;
/** The buddy can be dragged under the app bar; the pill must not follow it there. */
const PILL_MIN_Y = 96;

interface ShownAward {
  key: number;
  buddyKey: string;
  source: FriendshipSource;
  awarded: number;
  words: BuddyWord[];
  faceX: number;
  faceY: number;
  lineX: number;
  lineY: number;
}

type Anchor = Pick<ShownAward, 'faceX' | 'faceY' | 'lineX' | 'lineY'>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Measured at award time, not tracked: a subscription would re-render this on every drag frame. */
function anchorFromBuddy(): Anchor {
  const rect = document.querySelector('[data-home-buddy]')?.getBoundingClientRect();
  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;
  const measured = rect && (rect.width > 0 || rect.height > 0) ? rect : null;
  const centre = measured ? measured.left + measured.width / 2 : width / 2;
  return {
    faceX: centre,
    faceY: measured ? measured.bottom - 28 : height - 120,
    lineX: clamp(centre, LINE_HALF_WIDTH, width - LINE_HALF_WIDTH),
    lineY: measured ? Math.max(measured.top - 8, PILL_MIN_Y) : height - 180,
  };
}

export function FriendshipAwardToast() {
  const t = useTranslations('Home.buddy.friendship');
  const tItems = useTranslations('Shop.items');
  const tBuddies = useTranslations('Shop.buddies');
  const { brand } = useTheme().palette;
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  const { awardEvent, clearAwardEvent, storyRequest, levelUpEvent } = useBuddyFriendshipCtx();

  const [shown, setShown] = useState<ShownAward | null>(null);
  const nextKey = useRef(0);

  // storyRequest lands a render late: the provider opens the dialog from a
  // parent effect, which runs after this one, so the toast would flash first.
  const celebrating = !!storyRequest || !!(levelUpEvent && !isSessionRoute(pathname));

  useEffect(() => {
    if (!awardEvent) return;
    if (!celebrating) setShown({ key: ++nextKey.current, ...awardEvent, ...anchorFromBuddy() });
    clearAwardEvent();
  }, [awardEvent, celebrating, clearAwardEvent]);

  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => setShown(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  let line = '';
  let announcement = '';
  let hearts = 0;
  if (shown) {
    const name = tItems(`${shown.buddyKey}.name`);
    let copy: unknown = null;
    try {
      copy = tBuddies.raw(`${shown.buddyKey}.friendship`);
    } catch {
      // buddy without authored award lines — the chrome copy below stands in
    }
    const template = awardWordLine(copy, shown.source);
    const authored =
      (template && fillWordSlot(template, shown.words[0])) ?? awardLine(copy, shown.source);
    line = authored ?? t(`award.${shown.source}`, { name, count: shown.awarded });
    // Authored lines never mention hearts and the flying ones are aria-hidden.
    announcement = authored
      ? `${t('award.heartsEarned', { count: shown.awarded })} ${authored}`
      : line;
    hearts = Math.max(1, shown.awarded);
  }

  return (
    <>
      {/* Mounted while idle: VoiceOver and NVDA drop announcements from a live
          region that appears already carrying its text. */}
      <Box role="status" sx={visuallyHidden}>
        {announcement}
      </Box>

      {shown && (
        <>
          <Box
            key={`hearts-${shown.key}`}
            data-award-hearts
            aria-hidden
            sx={{
              position: 'fixed',
              left: shown.faceX,
              top: shown.faceY,
              zIndex: 1201,
              pointerEvents: 'none',
            }}
          >
            {Array.from({ length: hearts }, (_, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  left: `${(i - (hearts - 1) / 2) * 18}px`,
                  fontSize: '1.15rem',
                  lineHeight: 1,
                  transform: 'translate(-50%, -50%)',
                  animation: `${reducedMotion ? awardFade : heartLand} 1.1s ease-out forwards`,
                  animationDelay: `${i * 0.12}s`,
                  opacity: 0,
                }}
              >
                ❤️
              </Box>
            ))}
          </Box>

          <Box
            key={`line-${shown.key}`}
            aria-hidden
            sx={{
              position: 'fixed',
              left: shown.lineX,
              top: shown.lineY,
              zIndex: 1201,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
            }}
          >
            <Box
              sx={{
                maxWidth: `${LINE_HALF_WIDTH * 2}px`,
                px: 1.5,
                py: 0.75,
                borderRadius: 3,
                bgcolor: alpha('#fff', 0.96),
                border: `1.5px solid ${alpha(brand[300], 0.55)}`,
                boxShadow: `0 6px 18px ${alpha(brand[400], 0.22)}`,
                animation: `${reducedMotion ? awardFade : awardLineIn} ${VISIBLE_MS}ms ease-out forwards`,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1.35,
                  textAlign: 'center',
                }}
              >
                {line}
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </>
  );
}
