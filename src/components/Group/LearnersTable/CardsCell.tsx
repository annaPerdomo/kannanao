'use client';
import Typography from '@mui/material/Typography';

import type { GroupMember } from '@/hooks/useGroup';

import { cardsLabel } from './format';

interface CardsCellProps {
  member: GroupMember;
}

export function CardsCell({ member }: CardsCellProps) {
  return (
    <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
      {cardsLabel(member)}
    </Typography>
  );
}
