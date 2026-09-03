'use client';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import FavoriteIcon from '@mui/icons-material/Favorite';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { type FriendshipSource, HEARTS_PER_DAY } from '@/lib/friendship';

/** Adventure must land where TodayAdventureCard's own CTA does; nothing enforces it. */
const GOAL_ROUTES: Partial<Record<FriendshipSource, string>> = {
  adventure: '/review/start',
  session: '/review/start',
};

function Hearts({ count }: { count: number }) {
  const { brand } = useTheme().palette;
  return (
    <Box sx={{ display: 'flex', flexShrink: 0 }} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <FavoriteIcon key={i} sx={{ fontSize: 14, color: brand[400], ml: i ? -0.35 : 0 }} />
      ))}
    </Box>
  );
}

interface GoalRowProps {
  title: string;
  cta: string;
  points: number;
  done: boolean;
  dominant: boolean;
  busy: boolean;
  onAct: () => void;
}

function GoalRow({ title, cta, points, done, dominant, busy, onAct }: GoalRowProps) {
  const t = useTranslations('Home.buddy.friendship');
  const { brand } = useTheme().palette;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: dominant ? 1.25 : 0.9,
        borderRadius: 3,
        bgcolor: done ? alpha(brand[100], 0.45) : alpha('#fff', 0.92),
        border: `1.5px solid ${alpha(brand[300], done ? 0.35 : 0.5)}`,
        opacity: done ? 0.85 : 1,
      }}
    >
      <Hearts count={points} />
      <Typography
        sx={{
          flexGrow: 1,
          minWidth: 0,
          fontSize: dominant ? '0.9rem' : '0.82rem',
          fontWeight: dominant ? 800 : 600,
          color: 'text.primary',
        }}
      >
        {title}
      </Typography>
      {done ? (
        <CheckCircleRoundedIcon
          titleAccess={t('today.done')}
          sx={{ fontSize: 20, color: brand[400], flexShrink: 0 }}
        />
      ) : (
        <Button
          size="small"
          variant={dominant ? 'contained' : 'text'}
          onClick={onAct}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ flexShrink: 0, fontWeight: 800, whiteSpace: 'nowrap' }}
        >
          {cta}
        </Button>
      )}
    </Box>
  );
}

interface FriendshipDailyGoalsProps {
  name: string;
  onLeave: () => void;
}

export function FriendshipDailyGoals({ name, onLeave }: FriendshipDailyGoalsProps) {
  const t = useTranslations('Home.buddy.friendship');
  const { brand } = useTheme().palette;
  const router = useRouter();
  const { todayGoals, heartsToday, petBuddy, error, clearError } = useBuddyFriendshipCtx();
  const [petting, setPetting] = useState(false);

  // The context's error outlives the write that set it — a session award that
  // failed an hour ago must not greet whoever opens this dialog next.
  useEffect(() => clearError(), [clearError]);

  const act = (source: FriendshipSource) => () => {
    if (source === 'pet') {
      if (petting) return;
      setPetting(true);
      void petBuddy().finally(() => setPetting(false));
      return;
    }
    const href = GOAL_ROUTES[source];
    if (href) router.push(href);
    onLeave();
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: brand[700] }}>
        {t('today.heading', { name })}
      </Typography>

      {todayGoals.map((goal) => (
        <GoalRow
          key={goal.source}
          title={t(`today.${goal.source}.title`, { name })}
          cta={t(`today.${goal.source}.cta`, { name })}
          points={goal.points}
          done={goal.done}
          dominant={goal.source === 'adventure'}
          busy={petting && goal.source === 'pet'}
          onAct={act(goal.source)}
        />
      ))}

      {error && (
        <Alert severity="error" sx={{ py: 0, fontSize: '0.78rem' }}>
          {t('today.error')}
        </Alert>
      )}

      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', alignSelf: 'flex-end' }}>
        {t('today.footer', { earned: heartsToday, total: HEARTS_PER_DAY })}
      </Typography>
    </Box>
  );
}
