'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useFormatter, useTranslations } from 'next-intl';

import { getSet } from '@/lib/kanaCurriculum';

interface WeekSoundsLineProps {
  setIds: string[];
  dueDate: string;
  /** False when the educator switched this week's rows off. */
  handOut: boolean;
  /** After a failed apply the toggles freeze so a retry matches what was created. */
  locked: boolean;
  /** Rows a started member is still behind on — the rest are new to everyone. */
  shakySetIds: string[];
  onHandOutChange: (handOut: boolean) => void;
}

export function WeekSoundsLine({
  setIds,
  dueDate,
  handOut,
  locked,
  shakySetIds,
  onHandOutChange,
}: WeekSoundsLineProps) {
  const t = useTranslations('Group.lessonBuilder');
  const theme = useTheme();
  const format = useFormatter();
  const { brand } = theme.palette;

  if (setIds.length === 0) return null;

  const due = format.dateTime(new Date(`${dueDate}T00:00:00Z`), {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 1.25,
        borderRadius: theme.radii.md,
        bgcolor: alpha(brand[100], 0.45),
        opacity: handOut ? 1 : 0.6,
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Switch
          size="small"
          checked={handOut}
          disabled={locked}
          onChange={(e) => onHandOutChange(e.target.checked)}
          slotProps={{ input: { 'aria-label': t('soundsSwitchLabel', { date: due }) } }}
        />
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
          {t('soundsLineTitle', { date: due })}
        </Typography>
      </Stack>

      <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mt: 0.75, pl: 0.5 }}>
        {setIds.map((setId) => {
          const shaky = shakySetIds.includes(setId);
          return (
            <Tooltip
              key={setId}
              title={shaky ? t('soundsShaky') : t('soundsNewToAll')}
              enterTouchDelay={0}
            >
              <Typography
                component="span"
                tabIndex={0}
                sx={{
                  px: 1,
                  py: 0.3,
                  borderRadius: 2,
                  border: `1.5px solid ${alpha(brand[300], 0.6)}`,
                  bgcolor: 'background.paper',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: brand[800],
                }}
              >
                {getSet(setId)
                  ?.entries.map((e) => e.kana)
                  .join('')}
              </Typography>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
}
