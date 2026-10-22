'use client';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import FuriganaText from '@/components/FuriganaText';
import type { EndingItem } from '@/lib/grammarEndings';

import { ChoiceGrid } from '../ChoiceGrid';

interface EndingsPromptProps {
  item: EndingItem;
  choices: string[];
  correctText: string;
  selected: string | null;
  onSelect: (choice: string) => void;
}

/** A wrong pick never renders here — `EndingsMode` swaps straight to
 * `MissExplainer` instead, so `selected` is only ever null or correct. */
export function EndingsPrompt({
  item,
  choices,
  correctText,
  selected,
  onSelect,
}: EndingsPromptProps) {
  const t = useTranslations('Practice.endings');
  const tCommon = useTranslations('Practice.common');
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const answered = !!selected;

  return (
    <>
      <Box
        sx={{
          flex: '1 0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          textAlign: 'center',
          border: '2px solid',
          borderColor: answered ? 'success.main' : alpha(brand[300], 0.45),
          borderRadius: 3,
          p: { xs: 1.5, sm: 2 },
          mb: { xs: 1.5, sm: 2 },
          bgcolor: surfaces.input,
          boxShadow: `0 8px 24px ${alpha(brand[300], 0.12)}`,
          transition: 'border-color 0.25s',
        }}
      >
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1.5 }}>
          {item.card.example_en}
        </Typography>
        <Typography
          component="div"
          sx={{
            fontFamily: (th) => th.fonts.jp,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.8,
          }}
        >
          <FuriganaText text={item.before} showFurigana sx={{ display: 'inline' }} />
          <Chip
            component="span"
            label={selected ?? t('blank')}
            size="small"
            color={answered ? 'success' : 'default'}
            variant={answered ? 'filled' : 'outlined'}
            sx={{
              mx: 0.5,
              fontFamily: (th) => th.fonts.jp,
              fontWeight: 700,
              borderStyle: answered ? 'solid' : 'dashed',
              verticalAlign: 'middle',
            }}
          />
          <FuriganaText text={item.after} showFurigana sx={{ display: 'inline' }} />
        </Typography>
      </Box>

      <Box sx={{ flexShrink: 0 }}>
        <ChoiceGrid
          choices={choices}
          correct={correctText}
          selected={selected}
          onSelect={onSelect}
        />
      </Box>

      {answered && (
        <Box sx={{ textAlign: 'center', mb: 1, flexShrink: 0 }}>
          <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic' }}>
            {tCommon('correctMovingOn')}
          </Typography>
        </Box>
      )}
    </>
  );
}
