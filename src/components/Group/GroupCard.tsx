'use client';

import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { Group } from '@/hooks/useGroups';

interface GroupCardProps {
  group: Group;
  onClick: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}

export function GroupCard({ group, onClick, onPin }: GroupCardProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.groupCard');

  return (
    <Paper
      elevation={0}
      onClick={() => onClick(group.id)}
      sx={{
        p: 2.5,
        border: `1.5px solid ${alpha(brand[300], 0.35)}`,
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        bgcolor: alpha(brand[50], 0.5),
        '&:hover': {
          boxShadow: `0 4px 20px ${alpha(brand[300], 0.2)}`,
          transform: 'translateY(-2px)',
          borderColor: brand[400],
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
          {group.emoji && (
            <Typography sx={{ fontSize: '1.5rem', flexShrink: 0 }}>{group.emoji}</Typography>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{ fontWeight: 800, fontSize: '1rem', color: brand[800], lineHeight: 1.2 }}
              noWrap
            >
              {group.name}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {t('memberCount', { count: group.memberCount })}
            </Typography>
          </Box>
        </Stack>

        <IconButton
          size="small"
          aria-label={group.pinned ? t('unpinGroup') : t('pinGroup')}
          onClick={(e) => {
            e.stopPropagation();
            onPin(group.id, !group.pinned);
          }}
          sx={{ color: group.pinned ? brand[600] : alpha(brand[400], 0.5) }}
        >
          {group.pinned ? (
            <PushPinIcon sx={{ fontSize: 18 }} />
          ) : (
            <PushPinOutlinedIcon sx={{ fontSize: 18 }} />
          )}
        </IconButton>
      </Stack>
    </Paper>
  );
}
