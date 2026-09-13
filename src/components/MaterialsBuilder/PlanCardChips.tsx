'use client';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useFormatter, useTranslations } from 'next-intl';

import type { KanaGap } from '@/lib/kanaGaps';
import { isJlptLevel, JLPT_LEVELS, type JlptLevel } from '@/lib/lessonPrompts';
import type { PlanCard, WarmUpWord } from '@/types/lessonPlan';

interface PlanCardChipsProps {
  card: PlanCard;
  included: boolean;
  reuseSources: WarmUpWord[];
  kanaGaps: KanaGap[];
  targetLevel: JlptLevel;
}

function KanaGapDetail({ gaps }: { gaps: KanaGap[] }) {
  const t = useTranslations('Group.lessonBuilder');
  const untried = gaps[0]?.untried ?? [];

  return (
    <Box>
      {gaps.map((gap) => (
        <Typography key={gap.kana} sx={{ fontSize: '0.75rem' }}>
          {t('kanaGapWorkingOn', {
            kana: gap.kana,
            names: gap.shaky.map((m) => m.name).join('、'),
            count: gap.shaky.length,
          })}
        </Typography>
      ))}
      {untried.length > 0 && (
        <Typography sx={{ fontSize: '0.75rem', mt: 0.5 }}>
          {t('kanaGapUntried', { names: untried.map((m) => m.name).join('、') })}
        </Typography>
      )}
    </Box>
  );
}

export function PlanCardChips({
  card,
  included,
  reuseSources,
  kanaGaps,
  targetLevel,
}: PlanCardChipsProps) {
  const t = useTranslations('Group.lessonBuilder');
  const format = useFormatter();
  const theme = useTheme();
  const { brand } = theme.palette;

  if (!included) return null;

  const cardLevel = isJlptLevel(card.jlptLevel) ? card.jlptLevel : null;
  const aboveLevel =
    cardLevel !== null && JLPT_LEVELS.indexOf(cardLevel) > JLPT_LEVELS.indexOf(targetLevel);

  return (
    <>
      {aboveLevel && (
        <Chip
          size="small"
          label={t('aboveLevelChip', { level: cardLevel ?? '', target: targetLevel })}
          sx={{
            bgcolor: alpha(theme.palette.warning.light, 0.35),
            color: 'text.primary',
            fontWeight: 600,
          }}
        />
      )}
      {kanaGaps.length > 0 && (
        <Tooltip title={<KanaGapDetail gaps={kanaGaps} />}>
          <Chip
            size="small"
            label={t('kanaGapChip', { sounds: kanaGaps.map((g) => g.kana).join('・') })}
            sx={{ bgcolor: alpha(brand[200], 0.5), color: 'text.primary', fontWeight: 600 }}
          />
        </Tooltip>
      )}
      {reuseSources.map((source) => (
        <Tooltip
          key={source.word}
          title={
            source.addedAt
              ? t('buildsOnTooltipKnown', {
                  deckName: source.deckName,
                  date: format.dateTime(new Date(source.addedAt), {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }),
                })
              : t('buildsOnTooltipThisLesson', { deckName: source.deckName })
          }
        >
          <Chip
            size="small"
            label={t('buildsOnChipLabel', { word: source.word })}
            sx={{ bgcolor: alpha(brand[200], 0.5), color: 'text.primary', fontWeight: 600 }}
          />
        </Tooltip>
      ))}
    </>
  );
}
