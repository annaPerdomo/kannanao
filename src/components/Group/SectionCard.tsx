'use client';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

interface SectionCardProps {
  title: string;
  /** Small glyph before the heading. Decorative — mark it `aria-hidden`. */
  icon?: React.ReactNode;
  /** Right-hand control in the header row (toggle, small button, select). */
  action?: React.ReactNode;
  /** Pinned to the bottom of the card, under a divider (e.g. "Show all"). */
  footer?: React.ReactNode;
  /** Header-only mode: tightens padding and drops the body gap when `children` collapse to nothing. */
  compact?: boolean;
  children: React.ReactNode;
}

/**
 * Fixed header height and equal padding are what make a row of dashboard cards
 * line up — pass controls through `action` rather than drawing your own heading.
 */
export function SectionCard({
  title,
  icon,
  action,
  footer,
  compact = false,
  children,
}: SectionCardProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        p: compact ? { xs: 1, sm: 1.25 } : { xs: 2, sm: 2.5 },
        borderRadius: theme.radii.lg,
        border: `1px solid ${alpha(brand[300], 0.4)}`,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          minHeight: compact ? 28 : 34,
          mb: compact ? 0 : 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          {icon}
          <Typography
            component="h2"
            sx={{ fontWeight: 800, fontSize: '1rem', color: 'text.primary' }}
          >
            {title}
          </Typography>
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>

      {footer && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${alpha(brand[300], 0.3)}` }}>
          {footer}
        </Box>
      )}
    </Paper>
  );
}
