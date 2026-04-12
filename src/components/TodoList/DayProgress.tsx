'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme, alpha } from '@mui/material/styles';
import { XP_PER_TODO } from './helpers';

interface DayProgressProps {
  completedCount: number;
  totalCount: number;
}

export function DayProgress({ completedCount, totalCount }: DayProgressProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (totalCount === 0) return null;

  return (
    <Box mb={0.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75}>
        <Typography sx={{ color: brand[700], fontWeight: 800, fontSize: '0.78rem' }}>
          {progress === 100 ? '🎊' : '🌟'} {completedCount}/{totalCount} done
        </Typography>
        <Typography sx={{ color: 'text.disabled', fontWeight: 700, fontSize: '0.68rem' }}>
          {progress === 100 ? 'All done! ⭐' : `+${XP_PER_TODO} XP each ✨`}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 10,
          borderRadius: 5,
          bgcolor: alpha(brand[200], 0.25),
          '& .MuiLinearProgress-bar': {
            background: progress === 100
              ? `linear-gradient(90deg, ${brand[400]} 0%, ${brand[500]} 40%, ${accent[400]} 100%)`
              : `linear-gradient(90deg, ${brand[400]} 0%, ${brand[500]} 40%, ${accent[400]} 100%)`,
            borderRadius: 5,
            transition: 'width 0.6s ease',
          },
        }}
      />
    </Box>
  );
}
