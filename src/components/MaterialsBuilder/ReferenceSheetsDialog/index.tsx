'use client';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { LessonPlan } from '@/types/lessonPlan';

import { FlashcardSheetSection } from './FlashcardSheetSection';
import { KanaSheetSection } from './KanaSheetSection';
import { KanjiSheetSection } from './KanjiSheetSection';

interface ReferenceSheetsDialogProps {
  open: boolean;
  onClose: () => void;
  plan: LessonPlan;
  groupId?: string;
}

export function ReferenceSheetsDialog({
  open,
  onClose,
  plan,
  groupId,
}: ReferenceSheetsDialogProps) {
  const t = useTranslations('Group.lessonBuilder');
  const locale = useLocale();

  const [popupBlocked, setPopupBlocked] = useState(false);

  // The dialog never unmounts, so without this the previous print attempt's
  // alert is still on screen the next time a teacher opens it.
  useEffect(() => {
    if (!open) return;
    setPopupBlocked(false);
  }, [open]);

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('sheetsTitle')}
      subtitle={t('sheetsSubtitle')}
      icon="🖨️"
      titleId="reference-sheets-title"
      maxWidth="sm"
    >
      <Stack spacing={2.5}>
        <Typography variant="subtitle2">{t('sheetsPracticeHeading')}</Typography>
        <FlashcardSheetSection plan={plan} locale={locale} onPopupBlocked={setPopupBlocked} />

        <Divider />

        <Typography variant="subtitle2">{t('sheetsChartsHeading')}</Typography>
        <KanaSheetSection
          groupId={groupId}
          locale={locale}
          open={open}
          onPopupBlocked={setPopupBlocked}
        />
        <KanjiSheetSection plan={plan} locale={locale} onPopupBlocked={setPopupBlocked} />

        {popupBlocked && <Alert severity="warning">{t('sheetsPopupBlocked')}</Alert>}
      </Stack>
    </StyledDialog>
  );
}
