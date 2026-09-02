'use client';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { daysUntilDue, dueDateLabel } from '@/components/Group/dueDate';
import { useGoalLabel } from '@/components/Group/useGoalLabel';
import type { Assignment } from '@/hooks/useAssignments';
import { amber } from '@/theme';

interface LessonCardProps {
  assignment: Assignment;
  onStart: (assignment: Assignment) => void;
}

export function LessonCard({ assignment, onStart }: LessonCardProps) {
  const t = useTranslations('LearnerHome.lesson');
  const tDue = useTranslations('Group.assignmentCard');
  const { brand, accent } = useTheme().palette;
  const goal = useGoalLabel()(assignment);
  const deck = assignment.decks;
  const days = assignment.due_date ? daysUntilDue(assignment.due_date) : null;
  const best = assignment.progress_accuracy;
  const target = assignment.required_accuracy;
  const pct =
    target != null && best != null ? Math.min(100, Math.round((best / target) * 100)) : null;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 1.5, sm: 2 },
        alignItems: 'stretch',
        p: { xs: 1.5, sm: 2 },
        borderRadius: 4,
        bgcolor: 'background.paper',
        border: `1.5px solid ${alpha(brand[300], 0.35)}`,
        boxShadow: `0 6px 20px ${alpha(brand[400], 0.12)}`,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 10px 28px ${alpha(brand[400], 0.18)}`,
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: { xs: 56, sm: 68 },
          height: { xs: 56, sm: 68 },
          flexShrink: 0,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: { xs: '1.8rem', sm: '2.2rem' },
          background: `linear-gradient(135deg, ${alpha(brand[200], 0.8)} 0%, ${alpha(accent[200], 0.8)} 100%)`,
        }}
      >
        {deck?.emoji || '📚'}
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1rem', sm: '1.1rem' },
            color: 'text.primary',
            lineHeight: 1.25,
          }}
        >
          {deck?.name || tDue('unknownDeck')}
        </Typography>
        {assignment.note && (
          <Typography
            sx={{
              fontSize: '0.85rem',
              color: 'text.secondary',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {assignment.note}
          </Typography>
        )}
        {goal && (
          <Box>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.primary' }}>
              🎯 {goal}
              {best != null && ` · ${t('bestSoFar', { best })}`}
            </Typography>
            {pct != null && (
              <LinearProgress
                variant="determinate"
                value={pct}
                aria-label={t('goalProgressAria')}
                sx={{ mt: 0.5, height: 8, borderRadius: 999, maxWidth: 260 }}
              />
            )}
          </Box>
        )}
        {days != null && (
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: days < 3 ? amber[800] : 'text.secondary',
            }}
          >
            {days < 0 ? t('pastDue') : dueDateLabel(assignment.due_date, tDue)}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Button
          variant="contained"
          onClick={() => onStart(assignment)}
          startIcon={<PlayArrowRoundedIcon />}
          sx={{ fontWeight: 800, px: { xs: 1.5, sm: 2.5 }, borderRadius: 999 }}
        >
          {t('start')}
        </Button>
      </Box>
    </Box>
  );
}
