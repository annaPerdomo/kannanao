'use client';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import { handoutPagePath } from '@/lib/lessonUnits';
import type { HandoutRef } from '@/types/handout';

import { formatDate } from '../dueDate';
import { useGoalLabel } from '../useGoalLabel';
import { HandoutBody, type ViewMember } from './HandoutBody';

interface HandoutDetailDialogProps {
  open: boolean;
  onClose: () => void;
  handout: HandoutRef | null;
  groupId?: string | null;
  memberId?: string | null;
  memberName?: string | null;
}

export function HandoutDetailDialog({
  open,
  onClose,
  handout,
  groupId,
  memberId,
  memberName,
}: HandoutDetailDialogProps) {
  const t = useTranslations('Group.handoutDetail');
  const tLib = useTranslations('Materials.library');
  const locale = useLocale();
  const [viewMember, setViewMember] = useState<ViewMember | null>(null);
  const goal = useGoalLabel()({
    required_accuracy: handout?.requiredAccuracy ?? null,
    required_mode: handout?.requiredMode ?? null,
    kana_set: handout?.kanaSet ?? null,
  });

  const isDraft = handout?.status === 'draft';
  const name = handout ? (handout.emoji ? `${handout.emoji} ${handout.name}` : handout.name) : '';
  const title = isDraft ? (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <span>{name}</span>
      <Chip size="small" variant="outlined" label={tLib('statusDraft')} sx={{ fontWeight: 700 }} />
    </Stack>
  ) : (
    name
  );
  const subtitle = handout
    ? isDraft
      ? undefined
      : handout.dueDate
        ? t('dueOn', { date: formatDate(handout.dueDate, locale) })
        : t('noDueDate')
    : undefined;

  const handleClose = () => {
    setViewMember(null);
    onClose();
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      maxWidth="sm"
      titleId="handout-detail-title"
      actions={
        groupId && handout?.deckId ? (
          <Button
            component={Link}
            href={handoutPagePath(groupId, handout.deckId)}
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {t('openFullPage')}
          </Button>
        ) : undefined
      }
    >
      {handout && (
        <>
          {goal && (
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary', mb: 1 }}>
              {t('goal', { goal })}
            </Typography>
          )}
          {handout.availableOn && (
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1 }}>
              {t('availableFrom', { date: formatDate(handout.availableOn, locale) })}
            </Typography>
          )}
          {handout.note && (
            <Typography sx={{ fontSize: '0.85rem', color: 'text.primary', mb: 1.5 }}>
              {t('noteLine', { note: handout.note })}
            </Typography>
          )}
          <HandoutBody
            handout={handout}
            groupId={groupId}
            memberId={memberId}
            memberName={memberName}
            viewMember={viewMember}
            onPickLearner={setViewMember}
            onBackToGroup={() => setViewMember(null)}
            isDraft={isDraft}
          />
        </>
      )}
    </StyledDialog>
  );
}
