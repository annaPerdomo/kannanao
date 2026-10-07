import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import type { Flashcard } from '@/types/flashcard';

interface WordRowProps {
  card: Flashcard;
  trailing?: ReactNode;
}

export function WordRow({ card, trailing }: WordRowProps) {
  return (
    <Stack
      direction="row"
      sx={{ py: 0.5, alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}
    >
      <Stack sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
          {card.word}
        </Typography>
        {card.reading && card.reading !== card.word && (
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {card.reading}
          </Typography>
        )}
        <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>{card.meaning}</Typography>
      </Stack>
      {trailing && (
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
          {trailing}
        </Stack>
      )}
    </Stack>
  );
}
