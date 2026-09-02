'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { DAILY_REVIEW_CAP } from '@/lib/dailyPractice';

import { FACE_SIZE } from './styles';

/** Round on purpose: the "~N min" promise says "this is short", not a real ETA. */
const SECONDS_PER_CARD = 20;

export function minutesFor(dueCount: number): number {
  const played = Math.min(dueCount, DAILY_REVIEW_CAP);
  return Math.max(1, Math.ceil((played * SECONDS_PER_CARD) / 60));
}

/** Decorative — the buddy's name is already in the copy, hence the empty alt. */
function BuddyFace({ src }: { src: string }) {
  return (
    <Box
      sx={{
        width: FACE_SIZE,
        height: FACE_SIZE,
        flexShrink: 0,
        borderRadius: '50%',
        bgcolor: alpha('#fff', 0.92),
        border: `2px solid ${alpha('#fff', 0.5)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        component="img"
        src={src}
        alt=""
        draggable={false}
        sx={{ width: 42, height: 42, objectFit: 'contain', pointerEvents: 'none' }}
      />
    </Box>
  );
}

/**
 * One line, either the section label or the milestone tease — never both. The
 * card sits in the hero, which has room for one text block and no more.
 */
function Eyebrow({ children, label }: { children: React.ReactNode; label: boolean }) {
  return (
    <Typography
      variant="caption"
      component="p"
      sx={{
        display: 'block',
        fontWeight: 800,
        lineHeight: 1.4,
        color: alpha('#fff', label ? 0.75 : 0.92),
        ...(label ? { letterSpacing: '0.06em', textTransform: 'uppercase' } : { mb: 0.5 }),
      }}
    >
      {children}
    </Typography>
  );
}

interface StateProps {
  buddyName: string;
  faceSrc: string;
}

const linkSx = {
  color: '#fff',
  fontWeight: 700,
  textDecorationColor: alpha('#fff', 0.5),
  minWidth: 0,
  px: 0.5,
};

/**
 * The card body carries its own onClick, so every button here must stop the
 * click from reaching it.
 */
const handle = (fn: () => void) => (e: React.MouseEvent) => {
  e.stopPropagation();
  fn();
};

export function CompletedState({
  buddyName,
  faceSrc,
  hearts,
  onPractice,
  onPlayGame,
}: StateProps & { hearts: number; onPractice: () => void; onPlayGame: () => void }) {
  const t = useTranslations('Home.adventure');
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <BuddyFace src={faceSrc} />
        <Box sx={{ minWidth: 0, flexGrow: 1, flexBasis: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', lineHeight: 1.25 }}>
            {t('completedTitle')}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: alpha('#fff', 0.9) }}>
            {hearts > 0
              ? t('completedHearts', { count: hearts, name: buddyName })
              : t('completedBody')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handle(onPractice)}
          sx={{ flexShrink: 0, fontWeight: 800, px: 2.5 }}
        >
          {t('practiceMore')}
        </Button>
      </Box>
      <Button size="small" variant="text" onClick={handle(onPlayGame)} sx={linkSx}>
        {t('playGame')}
      </Button>
    </Box>
  );
}

export function DueState({
  buddyName,
  faceSrc,
  dueCount,
  friendshipLine,
  onStart,
  onPlayGame,
}: StateProps & {
  dueCount: number;
  friendshipLine?: string | null;
  onStart: () => void;
  onPlayGame: () => void;
}) {
  const t = useTranslations('Home.adventure');
  return (
    <Box>
      <Eyebrow label={!friendshipLine}>{friendshipLine ?? t('title')}</Eyebrow>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <BuddyFace src={faceSrc} />
        {/* flexBasis 0, not auto: max-content would be the title's
            hypothetical width and shove Start onto a row of its own. */}
        <Box sx={{ minWidth: 0, flexGrow: 1, flexBasis: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', lineHeight: 1.25 }}>
            {t('missionHelp', { name: buddyName })}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: alpha('#fff', 0.9) }}>
            {t('reviewsCount', { count: dueCount })} ·{' '}
            {t('minutesEstimate', { min: minutesFor(dueCount) })}
          </Typography>
        </Box>
        {/* Stock contained variant — the theme paints it with a background-image
            gradient that an sx bgcolor sits behind and never overrides. */}
        <Button
          variant="contained"
          onClick={handle(onStart)}
          sx={{ flexShrink: 0, fontWeight: 800, px: 2.5 }}
        >
          {t('start')}
        </Button>
      </Box>
      {/* The only route to the games hub from home while cards are due. */}
      <Button size="small" variant="text" onClick={handle(onPlayGame)} sx={linkSx}>
        {t('playGame')}
      </Button>
    </Box>
  );
}

export function NothingDueState({
  buddyName,
  faceSrc,
  onStart,
  onPlayGame,
}: StateProps & { onStart: () => void; onPlayGame: () => void }) {
  const t = useTranslations('Home.adventure');
  return (
    <Box>
      <Eyebrow label>{t('title')}</Eyebrow>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <BuddyFace src={faceSrc} />
        <Box sx={{ minWidth: 0, flexGrow: 1, flexBasis: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', lineHeight: 1.25 }}>
            {t('nothingDueTitle', { name: buddyName })}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: alpha('#fff', 0.9) }}>
            {t('nothingDueBody')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handle(onStart)}
          sx={{ flexShrink: 0, fontWeight: 800, px: 2.5 }}
        >
          {t('start')}
        </Button>
      </Box>
      <Button size="small" variant="text" onClick={handle(onPlayGame)} sx={linkSx}>
        {t('playGame')}
      </Button>
    </Box>
  );
}
