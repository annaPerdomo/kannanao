'use client';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { StyledDialog } from '@/components/StyledDialog';

import { ADD_SOURCES, type AddSource } from './constants';
import { SourceCard } from './SourceCard';
import { SourceRow } from './SourceRow';

interface AddToPlanDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onPick: (source: AddSource) => void;
}

const TITLE_ID = 'add-to-plan-dialog-title';

export function AddToPlanDialog({ open, onClose, groupName, onPick }: AddToPlanDialogProps) {
  const t = useTranslations('Group.addToPlan');
  const theme = useTheme();
  const [featured, ...rest] = ADD_SOURCES;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('dialogTitle')}
      subtitle={groupName}
      titleId={TITLE_ID}
      maxWidth="md"
    >
      {/* xs: a compact row per source — must all fit on one 390×844 screen without scrolling. */}
      <Box
        data-testid="source-rows"
        sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1.25 }}
      >
        {ADD_SOURCES.map((source) => (
          <SourceRow
            key={source.key}
            glyph={source.glyph}
            color={theme.palette.rainbow[source.colorKey]}
            title={t(`${source.key}.title`)}
            description={t(`${source.key}.description`)}
            featured={source.key === featured.key}
            ariaLabel={t(`${source.key}.title`)}
            onActivate={() => onPick(source.key)}
          />
        ))}
      </Box>

      <Box
        data-testid="source-cards"
        sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', gap: 2 }}
      >
        <SourceCard
          glyph={featured.glyph}
          color={theme.palette.rainbow[featured.colorKey]}
          title={t(`${featured.key}.title`)}
          description={t(`${featured.key}.description`)}
          cta={t('startCta')}
          featured
          ariaLabel={t(`${featured.key}.title`)}
          onActivate={() => onPick(featured.key)}
        />
        <Grid container spacing={2}>
          {rest.map((source) => (
            <Grid key={source.key} size={{ sm: 6 }}>
              <SourceCard
                glyph={source.glyph}
                color={theme.palette.rainbow[source.colorKey]}
                title={t(`${source.key}.title`)}
                description={t(`${source.key}.description`)}
                cta={t('chooseCta')}
                ariaLabel={t(`${source.key}.title`)}
                onActivate={() => onPick(source.key)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </StyledDialog>
  );
}
