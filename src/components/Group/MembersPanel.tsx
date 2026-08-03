'use client';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { GroupMember } from '@/hooks/useGroup';

import { MemberCard } from './MemberCard';
import { SectionCard } from './SectionCard';
import { ShowMoreButton } from './ShowMoreButton';

const ROWS_SHOWN = 6;
/** Must match the overview's "active this week", so the two counts split one roster. */
export const STALE_DAYS = 7;

type SortKey = 'attention' | 'active' | 'name';

/** Days since a member last studied; `Infinity` for someone who never has. */
export function daysSinceActive(lastActive: string | null, now = Date.now()): number {
  if (!lastActive) return Infinity;
  return (now - new Date(lastActive).getTime()) / 86_400_000;
}

export function sortMembers(members: GroupMember[], key: SortKey): GroupMember[] {
  const copy = [...members];
  if (key === 'name') {
    return copy.sort((a, b) =>
      (a.displayName || a.username).localeCompare(b.displayName || b.username),
    );
  }
  // Both remaining sorts rank by staleness; "attention" just reads it backwards.
  copy.sort((a, b) => daysSinceActive(b.lastActive) - daysSinceActive(a.lastActive));
  return key === 'attention' ? copy : copy.reverse();
}

interface MembersPanelProps {
  members: GroupMember[];
  onSelect: (id: string) => void;
}

export function MembersPanel({ members, onSelect }: MembersPanelProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.membersPanel');
  const [sortKey, setSortKey] = useState<SortKey>('attention');
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => sortMembers(members, sortKey), [members, sortKey]);
  const staleCount = members.filter((m) => daysSinceActive(m.lastActive) >= STALE_DAYS).length;
  const visible = expanded ? sorted : sorted.slice(0, ROWS_SHOWN);

  return (
    <SectionCard
      title={t('heading')}
      action={
        members.length > 1 && (
          <Select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            size="small"
            aria-label={t('sortAriaLabel')}
            sx={{
              borderRadius: theme.radii.sm,
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'text.primary',
              bgcolor: alpha(brand[50], 0.7),
              '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(brand[400], 0.4) },
            }}
          >
            <MenuItem value="attention" sx={{ fontSize: '0.85rem' }}>
              {t('sortAttention')}
            </MenuItem>
            <MenuItem value="active" sx={{ fontSize: '0.85rem' }}>
              {t('sortActive')}
            </MenuItem>
            <MenuItem value="name" sx={{ fontSize: '0.85rem' }}>
              {t('sortName')}
            </MenuItem>
          </Select>
        )
      }
    >
      {members.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2rem', mb: 1 }}>👋</Typography>
          <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            {t('emptyTitle')}
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {t('emptyBody')}
          </Typography>
        </Box>
      ) : (
        <>
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 1 }}>
            {staleCount > 0 ? t('staleSummary', { count: staleCount }) : t('allCaughtUp')}
          </Typography>
          {visible.map((member) => (
            <MemberCard key={member.id} member={member} onClick={onSelect} />
          ))}
          {members.length > ROWS_SHOWN && (
            <ShowMoreButton
              expanded={expanded}
              total={members.length}
              onClick={() => setExpanded((v) => !v)}
            />
          )}
        </>
      )}
    </SectionCard>
  );
}
