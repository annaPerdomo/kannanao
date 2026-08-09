'use client';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { Assignment } from '@/hooks/useAssignments';

import { timeAgo } from '../timeAgo';
import { groupBatchMembers, isNearGoal } from './batchMemberGrouping';
import { NudgeButton } from './NudgeButton';

interface BatchMemberListProps {
  id: string;
  members: Assignment[];
  requiredAccuracy: number | null;
  deckName: string;
  onSendEncouragement?: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
}

export function BatchMemberList({
  id,
  members,
  requiredAccuracy,
  deckName,
  onSendEncouragement,
}: BatchMemberListProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.assignmentsList');
  const tTime = useTranslations('Group.timeAgo');
  const rows = groupBatchMembers(members);
  const nudgeMessage = t('nudgeDefaultMessage', { deck: deckName });
  // Overlays the server's last_nudged_at, which won't refresh until the next fetch.
  const [justNudged, setJustNudged] = useState<Record<string, string>>({});

  return (
    <Box
      id={id}
      sx={{
        mt: 0.75,
        pt: 0.75,
        borderTop: `1px solid ${alpha(brand[300], 0.25)}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.6,
      }}
    >
      {rows.map((row) => {
        const lastNudgedAt = justNudged[row.memberId] ?? row.lastNudgedAt;
        const near = row.status === 'close' && isNearGoal(row.progressAccuracy, requiredAccuracy);
        const subline =
          row.status === 'done'
            ? [
                t('finishedOn', { date: timeAgo(row.completedAt, tTime) }),
                row.progressAccuracy != null ? `${row.progressAccuracy}%` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : row.status === 'close'
              ? t('bestSoFar', { accuracy: row.progressAccuracy ?? 0 })
              : t('notStartedLabel');

        return (
          <Box
            key={row.memberId}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.9, minWidth: 0 }}
          >
            {row.status === 'done' ? (
              <CheckCircleOutlineIcon
                aria-hidden
                sx={{ fontSize: 15, color: 'success.main', flexShrink: 0 }}
              />
            ) : (
              <FiberManualRecordIcon
                aria-hidden
                sx={{
                  fontSize: 9,
                  flexShrink: 0,
                  color:
                    row.status === 'close' ? theme.palette.warning.main : alpha(brand[400], 0.5),
                }}
              />
            )}

            <Typography
              sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.primary', flexShrink: 0 }}
              noWrap
            >
              {row.name}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }} noWrap>
                {subline}
              </Typography>
              {near && requiredAccuracy != null && (
                <Box
                  sx={{
                    flexShrink: 0,
                    px: 0.65,
                    py: 0.1,
                    borderRadius: theme.radii.sm,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    bgcolor: alpha(theme.palette.warning.main, 0.12),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
                    color: theme.palette.warning.main,
                  }}
                >
                  {t('memberGoalChip', { goal: requiredAccuracy })}
                </Box>
              )}
            </Box>

            {row.status !== 'done' && onSendEncouragement && (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.1 }}
              >
                <NudgeButton
                  memberId={row.memberId}
                  memberName={row.name}
                  message={nudgeMessage}
                  onSend={onSendEncouragement}
                  onSent={() =>
                    setJustNudged((prev) => ({ ...prev, [row.memberId]: new Date().toISOString() }))
                  }
                />
                {lastNudgedAt && (
                  <Typography
                    sx={{ fontSize: '0.62rem', color: 'text.secondary', whiteSpace: 'nowrap' }}
                  >
                    {t('lastNudged', { date: timeAgo(lastNudgedAt, tTime) })}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
