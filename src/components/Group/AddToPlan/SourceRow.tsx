'use client';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

interface SourceRowProps {
  glyph: string;
  color: string;
  title: string;
  description: string;
  featured?: boolean;
  ariaLabel: string;
  onActivate: () => void;
}

/** xs compact row — no hover motion here, unlike `SourceCard` (CLAUDE: none on xs). */
export function SourceRow({
  glyph,
  color,
  title,
  description,
  featured = false,
  ariaLabel,
  onActivate,
}: SourceRowProps) {
  const theme = useTheme();

  return (
    <Box
      component="button"
      type="button"
      onClick={onActivate}
      aria-label={ariaLabel}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: '12px 14px',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        borderRadius: theme.radii.md,
        border: `1.5px solid ${alpha(color, featured ? 0.5 : 0.3)}`,
        background: featured
          ? `linear-gradient(135deg, ${alpha(color, 0.14)}, ${alpha(color, 0.22)})`
          : `linear-gradient(135deg, #FFFFFF, ${alpha(color, 0.08)})`,
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: theme.radii.sm,
          display: 'grid',
          placeItems: 'center',
          background: `linear-gradient(135deg, ${alpha(color, 0.25)}, ${alpha(color, 0.1)})`,
          border: `1.5px solid ${alpha(color, 0.3)}`,
        }}
      >
        <Typography
          aria-hidden
          sx={{
            fontFamily: theme.fonts.jp,
            fontWeight: 900,
            fontSize: '1.1rem',
            lineHeight: 1,
            color,
          }}
        >
          {glyph}
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          noWrap
          sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'text.primary', lineHeight: 1.25 }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.7rem',
            color: 'text.secondary',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </Typography>
      </Box>

      <ChevronRightIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
    </Box>
  );
}
