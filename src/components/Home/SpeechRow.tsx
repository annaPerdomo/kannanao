'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import FuriganaText from '@/components/FuriganaText';
import { PinnableRow } from '@/components/PinnableRow';
import type { Ohanashikai } from '@/types/ohanashikai';

interface SpeechRowProps {
  speech: Ohanashikai;
  onOpen: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
}

/**
 * A pinned speech as one row: its title, the words it opens with, how many
 * lines it runs to, and what it is worth. Purple where a group row is pink,
 * matching how speeches are coloured everywhere else in the app.
 */
export function SpeechRow({ speech, onOpen, onPin }: SpeechRowProps) {
  const t = useTranslations('Ohanashikai.speechCard');
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  return (
    <PinnableRow
      onOpen={() => onOpen(speech.id)}
      ariaLabel={t('openSpeechAria', { name: speech.title })}
      hoverBorderColor={accent[300]}
      pin={
        onPin && {
          pinned: speech.pinned ?? false,
          onToggle: () => onPin(speech.id, !speech.pinned),
          pinLabel: t('pinToHome'),
          unpinLabel: t('unpinFromHome'),
        }
      }
    >
      <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.2, color: brand[900] }}
          noWrap
        >
          {speech.title}
        </Typography>

        {/* Falls back to the description, and shows neither if both are absent. */}
        {speech.firstLine ? (
          <Box
            sx={{
              fontFamily: (th) => th.fonts.jp,
              fontSize: '0.95rem',
              fontWeight: 700,
              color: accent[700],
              lineHeight: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <FuriganaText text={speech.firstLine} showFurigana />
          </Box>
        ) : (
          speech.description && (
            <Typography
              sx={{ fontSize: '0.85rem', fontWeight: 600, color: accent[700], lineHeight: 1.35 }}
              noWrap
            >
              {speech.description}
            </Typography>
          )
        )}

        <Box
          component="span"
          sx={{
            alignSelf: 'flex-start',
            px: 1.25,
            py: 0.25,
            borderRadius: (th) => th.radii.pill,
            bgcolor: alpha(accent[100], 0.8),
            color: accent[800],
            fontSize: '0.72rem',
            fontWeight: 800,
          }}
        >
          {t('linesCount', { count: speech.lineCount })}
        </Box>
      </Stack>

      {/* Bottom-aligned so it stacks under the corner pin rather than meeting
          it halfway down the row. */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}
      >
        <Typography
          sx={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.1, color: accent[600] }}
        >
          {(speech.lineCount * 10).toLocaleString()}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.65rem',
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          {t('xp')}
        </Typography>
      </Box>
    </PinnableRow>
  );
}
