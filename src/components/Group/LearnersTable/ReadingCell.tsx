'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { GroupMember } from '@/hooks/useGroup';

import { readingLabel } from './derive';

interface ReadingCellProps {
  member: GroupMember;
}

export function ReadingCell({ member }: ReadingCellProps) {
  const t = useTranslations('Group.learnersTable');
  const label = readingLabel(member, t);

  return (
    <Box>
      <Typography
        sx={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: label ? 'text.primary' : 'text.secondary',
        }}
        noWrap
      >
        {label ?? '—'}
      </Typography>
      {label && member.hiraganaKnown !== undefined && member.katakanaKnown !== undefined && (
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>
          {t('readingCounts', { hiragana: member.hiraganaKnown, katakana: member.katakanaKnown })}
        </Typography>
      )}
    </Box>
  );
}
