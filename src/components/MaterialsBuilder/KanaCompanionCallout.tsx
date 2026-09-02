'use client';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

interface KanaCompanionCalloutProps {
  /** Character lists of the rows this lesson leans on, e.g. 'ら · り · る · れ · ろ'. */
  sounds: string[];
  checked: boolean;
  disabled: boolean;
  onChange: (assign: boolean) => void;
}

export function KanaCompanionCallout({
  sounds,
  checked,
  disabled,
  onChange,
}: KanaCompanionCalloutProps) {
  const t = useTranslations('Group.lessonBuilder');
  const theme = useTheme();
  const { brand } = theme.palette;

  if (sounds.length === 0) return null;

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: theme.radii.md,
        bgcolor: alpha(brand[100], 0.5),
        border: `1px solid ${alpha(brand[300], 0.4)}`,
      }}
    >
      <Typography sx={{ fontSize: '0.85rem', color: 'text.primary', fontWeight: 600 }}>
        {t('kanaCompanionTitle', { sounds: sounds.join('　') })}
      </Typography>
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            size="small"
          />
        }
        label={
          <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
            {t('kanaCompanionToggle')}
          </Typography>
        }
        sx={{ mt: 0.5 }}
      />
    </Box>
  );
}
