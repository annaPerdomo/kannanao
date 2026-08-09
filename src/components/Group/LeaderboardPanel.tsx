'use client';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { Loading } from '@/components/Loading';
import type { LeaderboardEntry } from '@/hooks/useGroupLeaderboard';

import { LeaderboardWidget } from './LeaderboardWidget';
import { SectionCard } from './SectionCard';

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  maxVisible?: number;
  compact?: boolean;
}

export function LeaderboardPanel({
  entries,
  loading,
  visible,
  onVisibilityChange,
  maxVisible,
  compact,
}: LeaderboardPanelProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.groupPage');

  return (
    <SectionCard
      title={t('weeklyLeaderboard')}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            {visible ? t('visible') : t('hidden')}
          </Typography>
          <Switch
            size="small"
            checked={visible}
            onChange={(e) => onVisibilityChange(e.target.checked)}
            inputProps={{ 'aria-label': t('weeklyLeaderboard') }}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: brand[600] },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: brand[400] },
            }}
          />
        </Box>
      }
    >
      {!visible ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <EmojiEventsIcon sx={{ fontSize: 32, color: alpha(brand[400], 0.6), mb: 0.5 }} />
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {t('leaderboardHiddenBody')}
          </Typography>
        </Box>
      ) : loading ? (
        <Loading message={t('loadingLeaderboard')} />
      ) : (
        <LeaderboardWidget entries={entries} maxVisible={maxVisible} compact={compact} />
      )}
    </SectionCard>
  );
}
