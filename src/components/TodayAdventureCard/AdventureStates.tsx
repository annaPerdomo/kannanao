'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { FACE_SIZE } from './styles';

/** Round on purpose: the "~N min" promise says "this is short", not a real ETA. */
const SECONDS_PER_CARD = 20;

/** KanaRound drills every character twice — recognize, then recall. */
const KANA_QUESTIONS = 2;

export function minutesFor(dueCount: number): number {
  return Math.max(1, Math.ceil((dueCount * SECONDS_PER_CARD) / 60));
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

export function CompletedState({
  buddyName,
  faceSrc,
  hearts,
  onPlayGame,
}: StateProps & { hearts: number; onPlayGame: () => void }) {
  const t = useTranslations('Home.adventure');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <BuddyFace src={faceSrc} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', lineHeight: 1.25 }}>
          {t('completedTitle')}
        </Typography>
        {hearts > 0 && (
          <Typography variant="body2" sx={{ fontWeight: 600, color: alpha('#fff', 0.9) }}>
            {t('completedHearts', { count: hearts, name: buddyName })}
          </Typography>
        )}
        <Button size="small" variant="text" onClick={onPlayGame} sx={{ ...linkSx, ml: -0.5 }}>
          {t('playGame')}
        </Button>
      </Box>
    </Box>
  );
}

export function DueState({
  buddyName,
  faceSrc,
  dueCount,
  kanaCount,
  friendshipLine,
  onStart,
  onPlayGame,
}: StateProps & {
  dueCount: number;
  kanaCount?: number;
  friendshipLine?: string | null;
  onStart: () => void;
  onPlayGame: () => void;
}) {
  const kana = kanaCount ?? 0;
  const t = useTranslations('Home.adventure');
  // The card body carries its own onClick, so every button here must stop the
  // click from reaching it.
  const handle = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
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
            {[
              ...(dueCount > 0 ? [t('reviewsCount', { count: dueCount })] : []),
              ...(kana > 0 || dueCount === 0 ? [t('charactersCount', { count: kana })] : []),
              t('minutesEstimate', { min: minutesFor(dueCount + kana * KANA_QUESTIONS) }),
            ].join(' · ')}
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
  onPlayGame,
  onPracticeDeck,
}: {
  onPlayGame: () => void;
  onPracticeDeck: () => void;
}) {
  const t = useTranslations('Home.adventure');
  return (
    <Box>
      <Typography sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
        {t('nothingDueTitle')}
      </Typography>
      <Typography variant="body2" sx={{ color: alpha('#fff', 0.85), mb: 0.5 }}>
        {t('nothingDueBody')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button size="small" variant="text" onClick={onPlayGame} sx={linkSx}>
          {t('playGame')}
        </Button>
        <Button size="small" variant="text" onClick={onPracticeDeck} sx={linkSx}>
          {t('practiceDeck')}
        </Button>
      </Box>
    </Box>
  );
}
