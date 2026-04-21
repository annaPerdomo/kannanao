'use client';
import { Box, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { Label } from '@/components/Deck';
import { PRACTICE_CONFIG } from './constants';
import type { OhanashikaiPracticeMode } from '@/types/ohanashikai';

interface SpeechPracticeTilesProps {
  canPractice: boolean;
  onPractice: (mode: OhanashikaiPracticeMode) => void;
}

export function SpeechPracticeTiles({ canPractice, onPractice }: SpeechPracticeTilesProps) {
  const { brand, accent } = useTheme().palette;

  const tileThemes = [
    { color: accent[700], bg: `linear-gradient(135deg, ${accent[50]} 0%, ${alpha(accent[100], 0.8)} 100%)`, border: alpha(accent[300], 0.7), shadowColor: alpha(accent[700], 0.22) },
    { color: brand[700], bg: `linear-gradient(135deg, ${brand[50]} 0%, ${alpha(brand[100], 0.8)} 100%)`, border: alpha(brand[300], 0.7), shadowColor: alpha(brand[700], 0.22) },
  ];

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${alpha(brand[50], 0.9)} 0%, ${alpha(accent[50], 0.8)} 100%)`,
        borderRadius: 3,
        border: `1.5px solid ${alpha(brand[300], 0.35)}`,
        p: { xs: 2.5, sm: 3 },
        mb: 3,
      }}
    >
      <Label>Let&apos;s practice!</Label>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(2, 1fr)' }, gap: { xs: 1.5, sm: 2 } }}>
        {PRACTICE_CONFIG.map(({ mode, label, description, emoji, watermark }, i) => {
          const { color, bg, border, shadowColor } = tileThemes[i % tileThemes.length];
          return (
            <Box
              key={mode}
              onClick={canPractice ? () => onPractice(mode) : undefined}
              sx={{
                cursor: canPractice ? 'pointer' : 'default',
                position: 'relative', overflow: 'hidden', borderRadius: '18px',
                p: { xs: '20px 18px', sm: '24px 22px' }, minHeight: 150,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                background: bg, border: '1.5px solid', borderColor: border,
                opacity: canPractice ? 1 : 0.45,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                ...(canPractice && { '&:hover': { transform: 'translateY(-5px) scale(1.02)', boxShadow: `0 12px 32px ${shadowColor}` } }),
              }}
            >
              <Typography
                aria-hidden
                sx={{
                  position: 'absolute', bottom: -16, right: 6, fontSize: '5rem', lineHeight: 1,
                  color, opacity: 0.08, fontFamily: (t) => t.fonts.jp, fontWeight: 900, userSelect: 'none',
                }}
              >
                {watermark}
              </Typography>
              <Box>
                <Typography sx={{ fontSize: '1.75rem', lineHeight: 1, mb: 1 }}>{emoji}</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: '0.9rem', sm: '0.98rem' }, color, lineHeight: 1.2 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: alpha(color, 0.73), mt: 0.4 }}>
                  {description}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: canPractice ? color : 'text.disabled', letterSpacing: '0.04em', opacity: canPractice ? 0.8 : 0.5, alignSelf: 'flex-end' }}>
                {canPractice ? 'Start →' : 'Add lines first 🔒'}
              </Typography>
            </Box>
          );
        })}
      </Box>
      {!canPractice && (
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 1.5, textAlign: 'center' }}>
          Add at least 1 line to unlock practice modes.
        </Typography>
      )}
    </Box>
  );
}
