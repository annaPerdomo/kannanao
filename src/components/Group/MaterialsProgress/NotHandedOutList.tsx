'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { Deck } from '@/types/deck';

const SHOWN_LIMIT = 3;

interface NotHandedOutListProps {
  decks: Deck[];
  canAssign: boolean;
  onAssignDeck: (deckId: string) => void;
}

export function NotHandedOutList({ decks, canAssign, onAssignDeck }: NotHandedOutListProps) {
  const t = useTranslations('Group.materialsProgress');
  const shown = decks.slice(0, SHOWN_LIMIT);
  const remaining = decks.length - shown.length;

  return (
    <Box>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
        {t('notHandedOut')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {shown.map((deck) => (
          <Box
            key={deck.id}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
          >
            <Typography sx={{ fontSize: '0.82rem', color: 'text.primary', minWidth: 0 }} noWrap>
              {deck.emoji} {deck.name}
            </Typography>
            {canAssign && (
              <Button
                size="small"
                variant="text"
                onClick={() => onAssignDeck(deck.id)}
                aria-label={t('assignAria', { deck: deck.name })}
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}
              >
                {t('assign')}
              </Button>
            )}
          </Box>
        ))}
        {remaining > 0 && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {t('andMore', { count: remaining })}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
