'use client';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import type { Assignment } from '@/hooks/useAssignments';
import type { GroupMember } from '@/hooks/useGroup';

import { dueDateLabel, formatDate, todayIso } from '../dueDate';
import { useGoalLabel } from '../useGoalLabel';
import { missingMembers as computeMissingMembers } from './batchMemberGrouping';
import { BatchMemberList } from './BatchMemberList';
import type { AssignmentBatch } from './groupAssignments';

/** Only deadlines worth reacting to get a badge; the rest just show their date. */
function dueDateColor(dueDate: string | null): 'orange' | 'red' | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  const days = diff / (24 * 60 * 60 * 1000);
  if (days < 0) return 'red';
  if (days < 3) return 'orange';
  return null;
}

interface BatchRowProps {
  batch: AssignmentBatch;
  onEdit: () => void;
  onDelete: () => void;
  onSendEncouragement?: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
  members?: GroupMember[];
  assignments?: Assignment[];
  onAssignMissing?: (batch: AssignmentBatch, memberIds: string[]) => void;
  onOpenDetail: () => void;
}

export function BatchRow({
  batch,
  onEdit,
  onDelete,
  onSendEncouragement,
  members,
  assignments = [],
  onAssignMissing,
  onOpenDetail,
}: BatchRowProps) {
  const theme = useTheme();
  const t = useTranslations('Group.assignmentsList');
  const locale = useLocale();
  const { brand } = theme.palette;
  const [membersOpen, setMembersOpen] = useState(false);
  const isDone = batch.completed === batch.total;
  // Scheduled for a future date: visible to the organizer, not yet to the learner.
  const isScheduled = !!batch.availableOn && batch.availableOn > todayIso();
  const urgency = !isDone && !isScheduled ? dueDateColor(batch.dueDate) : null;
  const goal = useGoalLabel()(batch.sample);
  const urgencyColor = urgency === 'red' ? theme.palette.error.main : theme.palette.warning.main;
  const deckName = batch.deckName || t('unknownDeck');
  const pct = Math.round((batch.completed / batch.total) * 100);
  const emoji = isDone ? '✅' : batch.deckEmoji || '📚';

  const missing = members && !isScheduled ? computeMissingMembers(batch, members, assignments) : [];
  const missingIds = missing.map((m) => m.id);

  const membersListId = `assignment-members-${batch.ids[0]}`;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        border: `1px solid ${alpha(brand[300], isDone ? 0.2 : 0.35)}`,
        borderRadius: theme.radii.md,
        bgcolor: alpha(brand[50], isDone ? 0.25 : 0.5),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Typography sx={{ fontSize: '1.1rem', flexShrink: 0 }}>{emoji}</Typography>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <ButtonBase
              onClick={onOpenDetail}
              aria-label={t('seeContentsAria', { deckName })}
              sx={{
                minWidth: 0,
                justifyContent: 'flex-start',
                fontWeight: 700,
                fontSize: '0.88rem',
                color: 'text.primary',
                '&:hover, &:focus-visible': { textDecoration: 'underline' },
              }}
            >
              <Typography
                component="span"
                sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'text.primary', minWidth: 0 }}
                noWrap
              >
                {deckName}
              </Typography>
            </ButtonBase>
            <Typography
              sx={{
                ml: 'auto',
                flexShrink: 0,
                fontSize: '0.78rem',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: 'text.primary',
              }}
            >
              {isDone && missing.length > 0
                ? t('doneCountMissing', {
                    done: batch.completed,
                    total: batch.total,
                    missing: missing.length,
                  })
                : t('doneCount', { done: batch.completed, total: batch.total })}
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={pct}
            aria-label={deckName}
            sx={{
              my: 0.6,
              height: 7,
              borderRadius: 4,
              bgcolor: alpha(brand[200], 0.55),
              '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: brand[400] },
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', minWidth: 0 }} noWrap>
              {[
                isDone && batch.finishedAt
                  ? t('finishedDate', { date: formatDate(batch.finishedAt, locale) })
                  : null,
                // A future start date is the more useful fact: the learner cannot
                // see this one yet, so "due in 27 days" would be misleading alone.
                isScheduled
                  ? t('startsOn', { date: formatDate(batch.availableOn!, locale) })
                  : null,
                !isDone && batch.dueDate && !urgency
                  ? t('dueOn', { date: formatDate(batch.dueDate, locale) })
                  : null,
                goal ? t('goalLabel', { goal }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Typography>
            {urgency && (
              <Box
                sx={{
                  flexShrink: 0,
                  px: 0.75,
                  py: 0.15,
                  borderRadius: theme.radii.sm,
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  bgcolor: alpha(urgencyColor, 0.12),
                  border: `1px solid ${alpha(urgencyColor, 0.4)}`,
                  color: urgencyColor,
                }}
              >
                {dueDateLabel(batch.dueDate, t)}
              </Box>
            )}
          </Box>

          {missing.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3, minWidth: 0 }}>
              <PersonAddAltOutlinedIcon
                aria-hidden
                sx={{ fontSize: 14, flexShrink: 0, color: theme.palette.warning.main }}
              />
              <Typography
                sx={{ fontSize: '0.75rem', color: 'text.secondary', flexShrink: 0 }}
                noWrap
              >
                {t('neverGotThis', { count: missing.length })}
              </Typography>
              {onAssignMissing && (
                <Button
                  size="small"
                  onClick={() => onAssignMissing(batch, missingIds)}
                  aria-label={t('giveToThemAria', { deckName, count: missing.length })}
                  sx={{
                    minWidth: 0,
                    py: 0,
                    px: 0.5,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    color: brand[600],
                  }}
                >
                  {t('giveToThem')}
                </Button>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
          <IconButton
            size="small"
            onClick={() => setMembersOpen((v) => !v)}
            aria-label={
              membersOpen
                ? t('collapseMembersAria', { deckName })
                : t('expandMembersAria', { deckName })
            }
            aria-expanded={membersOpen}
            aria-controls={membersListId}
            sx={{ color: alpha(brand[400], 0.6), '&:hover': { color: brand[600] } }}
          >
            {membersOpen ? (
              <ExpandLessIcon sx={{ fontSize: 19 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 19 }} />
            )}
          </IconButton>
          <IconButton
            size="small"
            onClick={onEdit}
            aria-label={t('editAssignmentAria', { deckName })}
            sx={{ color: alpha(brand[400], 0.6), '&:hover': { color: brand[600] } }}
          >
            <EditIcon sx={{ fontSize: 17 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={onDelete}
            aria-label={t('removeAssignmentAria', { deckName })}
            sx={{ color: alpha(brand[400], 0.6), '&:hover': { color: 'error.main' } }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      <Collapse in={membersOpen}>
        <BatchMemberList
          id={membersListId}
          members={batch.members}
          requiredAccuracy={batch.sample.required_accuracy}
          deckName={deckName}
          onSendEncouragement={onSendEncouragement}
          missingMembers={missing}
        />
      </Collapse>
    </Paper>
  );
}
