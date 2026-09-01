'use client';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useFormatter, useTranslations } from 'next-intl';

import type { KanaGap } from '@/lib/kanaGaps';
import { isJlptLevel, JLPT_LEVELS, type JlptLevel } from '@/lib/lessonPrompts';
import type { PlanCard, WarmUpWord } from '@/types/lessonPlan';

interface PlanCardRowProps {
  card: PlanCard;
  index: number;
  reuseSources: WarmUpWord[];
  kanaGaps: KanaGap[];
  targetLevel: JlptLevel;
  /** After a failed apply the tick freezes so a retry matches what was created. */
  tickLocked: boolean;
  onChange: (patch: Partial<PlanCard>) => void;
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

export function PlanCardRow({
  card,
  index,
  reuseSources,
  kanaGaps,
  targetLevel,
  tickLocked,
  onChange,
}: PlanCardRowProps) {
  const t = useTranslations('Group.lessonBuilder');
  const format = useFormatter();
  const theme = useTheme();
  const { brand } = theme.palette;

  const included = !card.excluded;
  const cardLevel = isJlptLevel(card.jlptLevel) ? card.jlptLevel : null;
  const aboveLevel =
    cardLevel !== null && JLPT_LEVELS.indexOf(cardLevel) > JLPT_LEVELS.indexOf(targetLevel);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: theme.radii.md,
        bgcolor: included ? alpha(brand[100], 0.35) : 'transparent',
        border: included ? 'none' : `1px dashed ${alpha(brand[300], 0.6)}`,
        opacity: included ? 1 : 0.55,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Checkbox
          checked={included}
          disabled={tickLocked}
          onChange={(e) => onChange({ excluded: !e.target.checked })}
          slotProps={{
            input: {
              'aria-label': t('includeCardLabel', { word: card.word.trim() || `#${index + 1}` }),
            },
          }}
          sx={{ p: 0.5, mt: 0.5 }}
        />
        {card.imageUrl && (
          <Box
            component="img"
            src={card.imageUrl}
            alt=""
            sx={{
              width: 48,
              height: 48,
              borderRadius: theme.radii.sm,
              objectFit: 'cover',
              flexShrink: 0,
              mt: 0.5,
            }}
          />
        )}
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 1 }}>
            <TextField
              value={card.word}
              onChange={(e) => onChange({ word: e.target.value })}
              size="small"
              label={t('wordLabel')}
              disabled={!included}
              sx={{ flex: 1 }}
            />
            <TextField
              value={card.reading}
              onChange={(e) => onChange({ reading: e.target.value })}
              size="small"
              label={t('readingLabel')}
              disabled={!included}
              sx={{ flex: 1 }}
            />
            <TextField
              value={card.meaning}
              onChange={(e) => onChange({ meaning: e.target.value })}
              size="small"
              label={t('meaningLabel')}
              disabled={!included}
              sx={{ flex: 1.4 }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              value={card.exampleJp}
              onChange={(e) => onChange({ exampleJp: e.target.value })}
              size="small"
              label={t('exampleJpLabel')}
              disabled={!included}
              fullWidth
            />
            <TextField
              value={card.exampleEn}
              onChange={(e) => onChange({ exampleEn: e.target.value })}
              size="small"
              label={t('exampleEnLabel')}
              disabled={!included}
              fullWidth
            />
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {!included && (
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 600 }}>
                {t('cardSkippedNote')}
              </Typography>
            )}
            {included && aboveLevel && (
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
            {included && kanaGaps.length > 0 && (
              <Tooltip title={<KanaGapDetail gaps={kanaGaps} />}>
                <Chip
                  size="small"
                  label={t('kanaGapChip', { sounds: kanaGaps.map((g) => g.kana).join('・') })}
                  sx={{ bgcolor: alpha(brand[200], 0.5), color: 'text.primary', fontWeight: 600 }}
                />
              </Tooltip>
            )}
            {included &&
              reuseSources.map((source) => (
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
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
