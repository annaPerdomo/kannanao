'use client';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

/** The one button on this screen that asks for no decision. */
export function MixedPracticeButton({
  label,
  description,
  cta,
  ariaLabel,
  busy,
  onActivate,
}: {
  label: string;
  description: string;
  cta: string;
  ariaLabel: string;
  busy: boolean;
  onActivate: () => void;
}) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-busy={busy}
      onClick={busy ? undefined : onActivate}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!busy && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onActivate();
        }
      }}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: busy ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: { xs: 2.5, sm: 3.5 },
        py: { xs: 2.25, sm: 2.75 },
        mb: 1.5,
        borderRadius: theme.radii.lg,
        background: `linear-gradient(135deg, ${brand[400]}, ${accent[400]})`,
        boxShadow: `0 6px 22px ${alpha(brand[500], 0.35)}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': busy
          ? {}
          : {
              transform: 'translateY(-3px)',
              boxShadow: `0 12px 30px ${alpha(brand[500], 0.45)}`,
              '& .mixed-cta': { bgcolor: alpha('#FFFFFF', 0.35) },
            },
      }}
    >
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -22,
          right: 8,
          fontSize: '6rem',
          lineHeight: 1,
          fontFamily: theme.fonts.jp,
          fontWeight: 900,
          color: '#FFFFFF',
          opacity: 0.12,
          userSelect: 'none',
        }}
      >
        混
      </Typography>

      <Box sx={{ position: 'relative', textAlign: 'left' }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: '1.25rem', sm: '1.45rem' },
            color: '#FFFFFF',
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '0.78rem', sm: '0.85rem' },
            color: alpha('#FFFFFF', 0.92),
            mt: 0.25,
          }}
        >
          {description}
        </Typography>
      </Box>

      <Typography
        className="mixed-cta"
        sx={{
          position: 'relative',
          flexShrink: 0,
          px: 2.25,
          py: '7px',
          borderRadius: theme.radii.pill,
          border: `1.5px solid ${alpha('#FFFFFF', 0.6)}`,
          bgcolor: alpha('#FFFFFF', 0.2),
          color: '#FFFFFF',
          fontFamily: theme.fonts.cute,
          fontWeight: 800,
          fontSize: '0.85rem',
          whiteSpace: 'nowrap',
          transition: 'background-color 0.2s ease',
        }}
      >
        {cta}
      </Typography>
    </Box>
  );
}
