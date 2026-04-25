'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

interface PageHeroHeaderProps {
  emoji: string;
  title: string;
  subtitle: string;
  description?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}

export function PageHeroHeader({
  emoji,
  title,
  subtitle,
  description,
  onBack,
  action,
}: PageHeroHeaderProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        mb: 4,
        p: { xs: 3, sm: 4 },
        background: `linear-gradient(135deg, ${alpha(brand[100], 0.9)} 0%, ${alpha(accent[100], 0.8)} 100%)`,
        border: `2px solid ${alpha(brand[300], 0.3)}`,
        boxShadow: `0 8px 40px ${alpha(brand[300], 0.2)}`,
      }}
    >
      {/* Decorative blobs */}
      <Box
        sx={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: alpha(accent[200], 0.2),
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -20,
          left: '30%',
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: alpha(brand[200], 0.2),
          pointerEvents: 'none',
        }}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.75}>
            {onBack && (
              <IconButton
                onClick={onBack}
                size="small"
                sx={{
                  border: `1.5px solid ${alpha(brand[400], 0.5)}`,
                  borderRadius: '9px',
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  color: brand[700],
                  bgcolor: alpha('#FFFFFF', 0.5),
                  '&:hover': { bgcolor: alpha('#FFFFFF', 0.8), borderColor: brand[500] },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
            <Typography sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }}>{emoji}</Typography>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: brand[800], lineHeight: 1.1 }}>
                {title}
              </Typography>
              <Typography variant="body2" sx={{ color: brand[600], mt: 0.25 }}>
                {subtitle}
              </Typography>
            </Box>
          </Stack>
          {description && (
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 380 }}>
              {description}
            </Typography>
          )}
        </Box>

        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
    </Box>
  );
}
