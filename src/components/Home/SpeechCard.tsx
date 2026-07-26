'use client';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { CardFrame, CardStatBox, CardTopBar } from '@/components/CardFrame';
import type { Ohanashikai } from '@/types/ohanashikai';

/** Rotating cover emoji, so a wall of pinned speeches doesn't read as identical. */
const COVER_EMOJIS = ['🌸', '✨', '🌟', '💫', '🎀'] as const;

interface SpeechCardProps {
  speech: Ohanashikai;
  /** Position in the list — picks the cover emoji. */
  index?: number;
  onOpen: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
}

/**
 * A pinned speech, drawn as the same collectible card as a deck (see
 * CardFrame) so the home screen's two "pinned" columns read as one set. The
 * face swaps deck vocabulary for speech vocabulary: lines instead of cards.
 */
export function SpeechCard({ speech, index = 0, onOpen, onPin }: SpeechCardProps) {
  const t = useTranslations('Ohanashikai.speechCard');
  const { brand } = useTheme().palette;

  return (
    <CardFrame
      onOpen={() => onOpen(speech.id)}
      ariaLabel={t('openSpeechAria', { name: speech.title })}
    >
      <CardTopBar kind={t('speech')} xpLabel={t('xp')} xp={speech.lineCount * 10} />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          height: 120,
          borderBottom: `2px solid ${brand[400]}`,
        }}
      >
        <Box component="span" sx={{ fontSize: '1.6rem', lineHeight: 1, mb: 0.5 }}>
          {COVER_EMOJIS[index % COVER_EMOJIS.length]}
        </Box>
        <Typography
          sx={{
            fontSize: '1.3rem',
            fontWeight: 900,
            color: 'text.primary',
            lineHeight: 1.15,
            textAlign: 'center',
            // Two cards per row on a phone leaves less width than a single long
            // word ("Introduction"), and the card face clips its overflow.
            overflowWrap: 'anywhere',
          }}
        >
          {speech.title}
        </Typography>
        {speech.description && (
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: '#888',
              fontStyle: 'italic',
              lineHeight: 1.3,
              mt: 0.5,
              textAlign: 'center',
            }}
          >
            {speech.description}
          </Typography>
        )}
      </Box>

      <CardStatBox label={t('starLines')} value={t('linesCount', { count: speech.lineCount })} />

      <Box
        sx={{
          mt: 'auto',
          px: 1.5,
          py: '8px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {onPin && (
          <Box onClick={(e) => e.stopPropagation()}>
            <Tooltip title={speech.pinned ? t('unpinFromHome') : t('pinToHome')}>
              <IconButton
                size="small"
                aria-label={speech.pinned ? t('unpinFromHome') : t('pinToHome')}
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(speech.id, !speech.pinned);
                }}
                sx={{
                  width: 26,
                  height: 26,
                  color: speech.pinned ? brand[600] : brand[500],
                  bgcolor: speech.pinned ? alpha(brand[200], 0.6) : 'transparent',
                  border: `1px solid ${alpha(brand[400], speech.pinned ? 0.6 : 0.35)}`,
                  borderRadius: '6px',
                  '&:hover': {
                    color: brand[700],
                    bgcolor: alpha(brand[200], 0.7),
                    borderColor: alpha(brand[500], 0.6),
                  },
                }}
              >
                {speech.pinned ? (
                  <PushPinIcon sx={{ fontSize: 13 }} />
                ) : (
                  <PushPinOutlinedIcon sx={{ fontSize: 13 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </CardFrame>
  );
}
