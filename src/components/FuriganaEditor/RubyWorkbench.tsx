'use client';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { RubyLine, type RubyLineProps } from './RubyLine';
import { workbenchSx } from './styles';

interface RubyWorkbenchProps extends RubyLineProps {
  warnings: string[];
  onSplitAll?: () => void;
  onAutoFill?: () => void;
  filling?: boolean;
}

const HEADER_BUTTON_SX = { fontSize: '0.75rem', py: 0.25, whiteSpace: 'nowrap' } as const;

export function RubyWorkbench({
  warnings,
  onSplitAll,
  onAutoFill,
  filling,
  ...lineProps
}: RubyWorkbenchProps) {
  const t = useTranslations('FuriganaEditor');
  const { segments, tones, disabled } = lineProps;
  const hasKanji = segments.some((seg) => typeof seg !== 'string');

  return (
    <Box sx={workbenchSx}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        columnGap={0.5}
        minHeight={30}
      >
        <Typography
          variant="caption"
          sx={{
            display: { xs: 'none', sm: 'block' },
            mr: 'auto',
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: 'text.secondary',
          }}
        >
          {t('readings')}
        </Typography>
        {onSplitAll && (
          <Button
            size="small"
            startIcon={<CallSplitRoundedIcon fontSize="small" />}
            onClick={onSplitAll}
            disabled={disabled}
            sx={HEADER_BUTTON_SX}
          >
            {t('splitAll')}
          </Button>
        )}
        {onAutoFill && (
          <Button
            size="small"
            startIcon={
              filling ? <CircularProgress size={14} /> : <AutoFixHighRoundedIcon fontSize="small" />
            }
            onClick={onAutoFill}
            disabled={disabled || filling}
            sx={HEADER_BUTTON_SX}
          >
            {t('autoFill')}
          </Button>
        )}
      </Stack>

      {hasKanji ? (
        <RubyLine {...lineProps} />
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {t('noKanji')}
        </Typography>
      )}

      {tones.includes('error') && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75 }}>
          {t('kanaOnly')}
        </Typography>
      )}
      {warnings.map((warning) => (
        <Stack
          key={warning}
          direction="row"
          alignItems="flex-start"
          spacing={0.75}
          sx={{ mt: 0.75 }}
        >
          <WarningAmberRoundedIcon color="warning" sx={{ fontSize: 16, mt: '1px' }} />
          <Typography variant="caption" sx={{ color: 'text.primary' }}>
            {warning}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}
