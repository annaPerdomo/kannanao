'use client';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Loading } from '@/components/Loading';
import type { Assignment } from '@/hooks/useAssignments';
import type { DifficultWord } from '@/hooks/useDifficultWords';
import type { GroupMember } from '@/hooks/useGroup';

import { SectionCard } from '../SectionCard';
import { loadCollapsed, saveCollapsed } from './collapseStorage';
import { MAX_VISIBLE_ROWS } from './constants';
import { deriveAttentionItems } from './deriveAttentionItems';
import { QuickNudgeDialog } from './QuickNudgeDialog';
import { NeedsAttentionRow } from './Row';
import type { AttentionItem } from './types';

const BODY_ID = 'needs-attention-body';

interface NeedsAttentionProps {
  groupId: string;
  members: GroupMember[];
  assignments: Assignment[];
  /** Required: without them the panel claims "all caught up" off a list that never arrived. */
  assignmentsLoading?: boolean;
  assignmentsError?: string | null;
  /** Group-wide difficult words; only the forgotten ones produce a row. */
  words?: DifficultWord[];
  /** Same reason as `assignmentsLoading` — words resolve last of the three. */
  wordsLoading?: boolean;
  wordsError?: string | null;
  onSelectMember: (memberId: string) => void;
  onViewAssignments: () => void;
  onViewLearners: () => void;
  onViewWords: () => void;
  onSendEncouragement: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
}

function rowKey(item: AttentionItem): string {
  if (item.kind === 'inactiveLearner') return `inactive-${item.memberId}`;
  if (item.kind === 'inactiveLearnersCollapsed') return 'inactive-collapsed';
  if (item.kind === 'reviewBacklog') return `backlog-${item.memberId}`;
  if (item.kind === 'reviewBacklogCollapsed') return 'backlog-collapsed';
  if (item.kind === 'wordsForgotten') return 'words-forgotten';
  return `assignment-${item.batchKey}`;
}

export function NeedsAttention({
  groupId,
  members,
  assignments,
  assignmentsLoading = false,
  assignmentsError = null,
  words,
  wordsLoading = false,
  wordsError = null,
  onSelectMember,
  onViewAssignments,
  onViewLearners,
  onViewWords,
  onSendEncouragement,
}: NeedsAttentionProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.needsAttention');
  // Not a lazy initializer: seeding from localStorage hydrates a different
  // value than the server rendered. The effect below applies it a frame later,
  // and re-applies it when the organizer switches groups on this instance.
  const [collapsed, setCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [nudgeTarget, setNudgeTarget] = useState<{
    id: string;
    name: string;
    lastNudgedAt: string | null;
  } | null>(null);
  const [sentEmoji, setSentEmoji] = useState<string | null>(null);

  const handleNudgeSent = useCallback((emoji: string) => {
    setNudgeTarget(null);
    setSentEmoji(emoji);
  }, []);

  useEffect(() => {
    setCollapsed(loadCollapsed(groupId));
  }, [groupId]);

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    saveCollapsed(groupId, next);
  }, [collapsed, groupId]);

  const items = useMemo(
    () => deriveAttentionItems(members, assignments, words),
    [members, assignments, words],
  );
  const visible = showAll ? items : items.slice(0, MAX_VISIBLE_ROWS);
  const hasMore = items.length > MAX_VISIBLE_ROWS;

  return (
    <>
      <SectionCard
        compact={collapsed}
        icon={
          <NotificationsActiveOutlinedIcon
            aria-hidden
            sx={{ fontSize: collapsed ? '1rem' : '1.15rem', color: brand[600] }}
          />
        }
        title={
          collapsed && items.length > 0
            ? t('headingWithCount', { count: items.length })
            : t('heading')
        }
        action={
          <IconButton
            size="small"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t('showPanelAction') : t('hidePanelAction')}
            aria-expanded={!collapsed}
            aria-controls={BODY_ID}
            sx={{ color: brand[700], p: collapsed ? 0.25 : undefined }}
          >
            {collapsed ? (
              <ExpandMoreIcon sx={{ fontSize: 20 }} />
            ) : (
              <ExpandLessIcon sx={{ fontSize: 20 }} />
            )}
          </IconButton>
        }
        footer={
          !collapsed && hasMore ? (
            <Box sx={{ textAlign: 'right' }}>
              <Button
                size="small"
                variant="text"
                onClick={() => setShowAll((v) => !v)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: brand[700],
                }}
              >
                {showAll ? t('showLessAction') : t('viewAllCount', { count: items.length })}
              </Button>
            </Box>
          ) : undefined
        }
      >
        <Collapse in={!collapsed} id={BODY_ID}>
          {(assignmentsError || wordsError) && (
            <Stack spacing={1} sx={{ mb: items.length ? 1.5 : 0 }}>
              {assignmentsError && (
                <Alert severity="error" sx={{ fontSize: '0.8rem' }}>
                  {assignmentsError}
                </Alert>
              )}
              {wordsError && (
                <Alert severity="error" sx={{ fontSize: '0.8rem' }}>
                  {wordsError}
                </Alert>
              )}
            </Stack>
          )}

          {items.length > 0 ? (
            <Stack divider={<Divider />} spacing={0}>
              {visible.map((item) => (
                <NeedsAttentionRow
                  key={rowKey(item)}
                  item={item}
                  onSelectMember={onSelectMember}
                  onSendNudge={(id, name) =>
                    setNudgeTarget({
                      id,
                      name,
                      lastNudgedAt: members.find((m) => m.id === id)?.lastNudgedAt ?? null,
                    })
                  }
                  onViewAssignments={onViewAssignments}
                  onViewLearners={onViewLearners}
                  onViewWords={onViewWords}
                />
              ))}
            </Stack>
          ) : assignmentsLoading || wordsLoading ? (
            <Loading message={t('loadingMessage')} />
          ) : (
            !assignmentsError &&
            !wordsError && (
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', py: 1 }}>
                {t('allCaughtUp')}
              </Typography>
            )
          )}
        </Collapse>
      </SectionCard>

      <QuickNudgeDialog
        open={!!nudgeTarget}
        target={nudgeTarget}
        onClose={() => setNudgeTarget(null)}
        onSend={onSendEncouragement}
        onSent={handleNudgeSent}
      />

      <Snackbar
        open={!!sentEmoji}
        autoHideDuration={3000}
        onClose={() => setSentEmoji(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ fontSize: '0.85rem' }}>
          {sentEmoji} {t('nudgeSent')}
        </Alert>
      </Snackbar>
    </>
  );
}
