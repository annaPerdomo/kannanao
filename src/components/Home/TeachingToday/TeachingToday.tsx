'use client';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { SectionCard } from '@/components/Group/SectionCard';
import type { Group } from '@/hooks/useGroups';

import { TeachingTodayRow } from './TeachingTodayRow';

const MAX_GROUPS = 3;

/** Pinned first, otherwise the API's own order — never re-sorted by recency. */
function partitionGroups(groups: Group[]): Group[] {
  return [...groups.filter((g) => g.pinned), ...groups.filter((g) => !g.pinned)];
}

export function TeachingToday({ groups }: { groups: Group[] }) {
  const theme = useTheme();
  const t = useTranslations('Home.teachingToday');
  const [attentionById, setAttentionById] = useState<Record<string, boolean | null>>({});

  const shown = useMemo(() => partitionGroups(groups).slice(0, MAX_GROUPS), [groups]);
  const hasMore = groups.length > MAX_GROUPS;

  const handleAttention = useCallback((groupId: string, hasAttention: boolean | null) => {
    setAttentionById((prev) => ({ ...prev, [groupId]: hasAttention }));
  }, []);

  if (groups.length === 0) return null;

  const resolved = shown.map((g) => attentionById[g.id]);
  const allResolved = resolved.every((v) => v !== undefined);
  const allQuiet = allResolved && resolved.every((v) => v === false);

  return (
    <SectionCard
      title={t('heading')}
      icon={
        <SchoolRoundedIcon
          aria-hidden
          sx={{ fontSize: '1.15rem', color: theme.palette.brand[600] }}
        />
      }
      footer={
        hasMore ? (
          <Box
            component={Link}
            href="/group"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              minHeight: 48,
              textDecoration: 'none',
              color: theme.palette.brand[700],
              fontWeight: 700,
              fontSize: '0.8rem',
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.brand[500]}`,
                outlineOffset: 2,
              },
            }}
          >
            {t('allGroups')}
          </Box>
        ) : undefined
      }
    >
      {allQuiet && (
        <Typography sx={{ fontSize: '0.88rem', color: 'text.primary', mb: 1.25 }}>
          🌸 {t('allQuiet')}
        </Typography>
      )}
      <Stack
        direction={allQuiet ? 'row' : 'column'}
        spacing={allQuiet ? 1 : 0}
        divider={allQuiet ? undefined : <Divider />}
        sx={allQuiet ? { flexWrap: 'wrap', rowGap: 1 } : undefined}
      >
        {shown.map((g) => (
          <TeachingTodayRow key={g.id} group={g} onAttention={handleAttention} compact={allQuiet} />
        ))}
      </Stack>
    </SectionCard>
  );
}
