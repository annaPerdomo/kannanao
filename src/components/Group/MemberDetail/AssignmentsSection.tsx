import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { MemberDetail } from '@/hooks/useGroup';

import { useGoalLabel } from '../useGoalLabel';
import { useMemberFormatters } from './helpers';

type Assignments = MemberDetail['assignments'];

interface AssignmentsSectionProps {
  assignments: Assignments;
}

export function AssignmentsSection({ assignments }: AssignmentsSectionProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.memberDetail');
  const tList = useTranslations('Group.assignmentsList');
  const getGoalLabel = useGoalLabel();
  const { formatDate } = useMemberFormatters();

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.85rem',
          color: brand[700],
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          mb: 1.5,
        }}
      >
        {t('assignmentsHeading')}
      </Typography>

      {/* Completion summary */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 1.5,
          border: `1px solid ${alpha(brand[300], 0.3)}`,
          borderRadius: 2.5,
          bgcolor: alpha(brand[50], 0.4),
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon sx={{ fontSize: 18, color: brand[600] }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: brand[800] }}>
              {t('assignmentsCompleted', {
                completed: assignments.completed,
                total: assignments.total,
              })}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: brand[600] }}>
            {assignments.completionRate}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={assignments.completionRate}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: alpha(brand[200], 0.5),
            '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: brand[400] },
            mb: 1,
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, fontSize: '0.7rem', color: 'text.secondary' }}>
          <span>{t('assignmentsPending', { count: assignments.pending })}</span>
          {assignments.overdue > 0 && (
            <Box
              component="span"
              sx={{
                color: 'error.main',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
              }}
            >
              <WarningAmberIcon sx={{ fontSize: 12 }} />
              {t('assignmentsOverdue', { count: assignments.overdue })}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Individual assignments */}
      {assignments.items.map((a) => {
        const isCompleted = !!a.completedAt;
        const isOverdue =
          !isCompleted && !!a.dueDate && a.dueDate < new Date().toISOString().slice(0, 10);
        const goal = getGoalLabel({
          required_accuracy: a.requiredAccuracy,
          required_mode: a.requiredMode,
        });
        return (
          <Paper
            key={a.id}
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.25,
              mb: 0.75,
              border: `1px solid ${alpha(
                isOverdue ? theme.palette.error.main : brand[300],
                isOverdue ? 0.35 : 0.25,
              )}`,
              borderRadius: 2,
              bgcolor: alpha(
                isCompleted ? brand[50] : isOverdue ? theme.palette.error.main : brand[50],
                isCompleted ? 0.2 : isOverdue ? 0.05 : 0.3,
              ),
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                {isCompleted ? (
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />
                ) : isOverdue ? (
                  <WarningAmberIcon sx={{ fontSize: 16, color: 'error.main', flexShrink: 0 }} />
                ) : (
                  <AssignmentIcon sx={{ fontSize: 16, color: brand[400], flexShrink: 0 }} />
                )}
                <Typography sx={{ fontSize: '0.75rem', flexShrink: 0 }}>
                  {a.deckEmoji || '📚'}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isCompleted ? 'text.secondary' : brand[800],
                    textDecoration: isCompleted ? 'line-through' : 'none',
                  }}
                  noWrap
                >
                  {a.title || a.deckName}
                </Typography>
              </Box>
              {goal && (
                <Typography
                  sx={{ fontSize: '0.65rem', fontWeight: 600, color: 'text.primary', mt: 0.25 }}
                  noWrap
                >
                  {tList('goalProgress', {
                    goal,
                    state: a.progressAccuracy != null ? (isCompleted ? 'reached' : 'best') : 'none',
                    accuracy: a.progressAccuracy ?? 0,
                  })}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
              {a.dueDate && (
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    color: isOverdue ? 'error.main' : 'text.secondary',
                    fontWeight: isOverdue ? 600 : 400,
                  }}
                >
                  {t('dueOn', { date: formatDate(a.dueDate) })}
                </Typography>
              )}
              {isCompleted && (
                <Typography sx={{ fontSize: '0.65rem', color: 'success.main', fontWeight: 600 }}>
                  {formatDate(a.completedAt)}
                </Typography>
              )}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
