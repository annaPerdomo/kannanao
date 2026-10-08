'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

interface SourceCardProps {
  glyph: string;
  color: string;
  title: string;
  description: string;
  cta: string;
  /** Full-width hero card with a filled CTA, instead of one of the four grid tiles. */
  featured?: boolean;
  ariaLabel: string;
  onActivate: () => void;
}

/** sm+ card — the xs breakpoint uses the compact `SourceRow` instead. */
export function SourceCard({
  glyph,
  color,
  title,
  description,
  cta,
  featured = false,
  ariaLabel,
  onActivate,
}: SourceCardProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
      aria-label={ariaLabel}
      sx={{
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        borderRadius: theme.radii.lg,
        display: 'flex',
        flexDirection: featured ? { xs: 'column', sm: 'row' } : 'column',
        alignItems: 'center',
        justifyContent: featured ? 'flex-start' : 'space-between',
        textAlign: featured ? { xs: 'center', sm: 'left' } : 'center',
        gap: featured ? 2 : 0,
        p: featured ? { xs: '20px', sm: '22px 28px' } : { xs: '18px 14px', sm: '22px 18px' },
        minHeight: featured ? undefined : 190,
        background: `linear-gradient(150deg, #FFFFFF 0%, ${alpha(color, 0.07)} 55%, ${alpha(color, 0.17)} 100%)`,
        border: `1.5px solid ${alpha(color, 0.35)}`,
        boxShadow: `0 3px 12px ${alpha(color, 0.08)}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-5px) scale(1.02)',
          boxShadow: `0 14px 32px ${alpha(color, 0.25)}`,
        },
      }}
    >
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -18,
          right: 2,
          fontSize: featured ? '7rem' : '5rem',
          lineHeight: 1,
          fontFamily: theme.fonts.jp,
          fontWeight: 900,
          color,
          opacity: 0.08,
          userSelect: 'none',
        }}
      >
        {glyph}
      </Typography>

      <Box
        sx={{
          position: 'relative',
          flexShrink: 0,
          width: featured ? 64 : 56,
          height: featured ? 64 : 56,
          borderRadius: theme.radii.md,
          display: 'grid',
          placeItems: 'center',
          background: `linear-gradient(135deg, ${alpha(color, 0.2)}, ${alpha(color, 0.08)})`,
          border: `1.5px solid ${alpha(color, 0.25)}`,
          mb: featured ? { xs: 1, sm: 0 } : 1.25,
        }}
      >
        <Typography
          aria-hidden
          sx={{
            fontFamily: theme.fonts.jp,
            fontWeight: 900,
            fontSize: featured ? '2.1rem' : '1.75rem',
            lineHeight: 1,
            color,
            userSelect: 'none',
          }}
        >
          {glyph}
        </Typography>
      </Box>

      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: featured ? { xs: 'center', sm: 'flex-start' } : 'center',
          flexGrow: featured ? 1 : 0,
          minWidth: 0,
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: featured ? { xs: '1.05rem', sm: '1.15rem' } : { xs: '0.95rem', sm: '1rem' },
            color: 'text.primary',
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontSize: featured ? '0.8rem' : '0.72rem',
            color: 'text.secondary',
            mt: 0.5,
            lineHeight: 1.35,
          }}
        >
          {description}
        </Typography>
      </Box>

      <Typography
        sx={{
          position: 'relative',
          mt: featured ? { xs: 1.5, sm: 0 } : 1.5,
          flexShrink: 0,
          width: featured ? { xs: '100%', sm: 'auto' } : '100%',
          maxWidth: featured ? { sm: 160 } : 170,
          px: 2.5,
          py: '7px',
          textAlign: 'center',
          borderRadius: theme.radii.pill,
          fontSize: '0.78rem',
          fontWeight: 800,
          lineHeight: 1.4,
          fontFamily: theme.fonts.cute,
          letterSpacing: '0.02em',
          ...(featured
            ? {
                // Matches MuiButton's `contained` gradient — brand[400]/accent[400] read under AA for white text.
                border: '1.5px solid transparent',
                background: `linear-gradient(135deg, ${brand[600]} 0%, ${brand[700]} 100%)`,
                color: '#FFFFFF',
                boxShadow: `0 3px 10px ${alpha(brand[700], 0.35)}`,
              }
            : {
                border: `1.5px solid ${alpha(color, 0.45)}`,
                color: 'text.primary',
                bgcolor: alpha('#FFFFFF', 0.55),
              }),
        }}
      >
        {cta}
      </Typography>
    </Box>
  );
}
