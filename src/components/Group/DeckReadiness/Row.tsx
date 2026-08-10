'use client';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { DeckReadiness } from '@/hooks/useDeckReadiness';
import type { GroupMember } from '@/hooks/useGroup';

import { tierColors } from './constants';
import { readinessLevel, readinessMeter, strugglingNames } from './readiness';

interface DeckReadinessRowProps {
  deck: DeckReadiness;
  members: GroupMember[];
  onViewLearners: () => void;
}

export function DeckReadinessRow({ deck, members, onViewLearners }: DeckReadinessRowProps) {
  const theme = useTheme();
  const t = useTranslations('Group.deckReadiness');
  const tiers = tierColors(theme);

  const meter = readinessMeter(deck);
  const verdict = t(`level.${readinessLevel(deck)}`);
  const struggling = strugglingNames(deck.strugglingLearnerIds, members);
  // Count only the learners we can name, so "5 learners" never sits above a
  // list of two; the raw ids are the fallback when none of them resolve.
  const strugglingCount = struggling.resolved || deck.strugglingLearnerIds.length;

  const filled = [
    { key: 'strong', pct: meter.strongPct, color: tiers.strong },
    { key: 'learning', pct: meter.learningPct, color: tiers.learning },
    { key: 'unseen', pct: meter.unseenPct, color: tiers.unseen },
  ].filter((s) => s.pct > 0);
  // A deck nobody is assigned has no tiers at all — draw the bare track, not an
  // invisible meter that reads as a rendering failure.
  const segments = filled.length > 0 ? filled : [{ key: 'empty', pct: 100, color: tiers.unseen }];

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onViewLearners}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onViewLearners();
        }
      }}
      aria-label={t('rowAriaLabel', {
        deck: deck.deckName,
        strong: meter.strongPct,
        learning: meter.learningPct,
        unseen: meter.unseenPct,
        verdict,
      })}
      sx={{
        py: 1.1,
        cursor: 'pointer',
        borderRadius: theme.radii.sm,
        '&:focus-visible': { outline: `2px solid ${theme.palette.brand[500]}`, outlineOffset: 3 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography
          sx={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}
          noWrap
        >
          {deck.deckEmoji || '📚'} {deck.deckName}
        </Typography>
        <Typography
          aria-hidden
          sx={{
            flexShrink: 0,
            fontSize: '0.78rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: 'text.secondary',
          }}
        >
          {t('strongPct', { pct: meter.strongPct })}
        </Typography>
      </Box>

      <Box
        aria-hidden
        sx={{
          display: 'flex',
          gap: '2px',
          height: 10,
          mt: 0.75,
          borderRadius: 99,
          bgcolor: 'background.paper',
        }}
      >
        {segments.map((s) => (
          <Box
            key={s.key}
            sx={{ flexGrow: s.pct, flexBasis: 0, bgcolor: s.color, borderRadius: 99 }}
          />
        ))}
      </Box>

      <Typography sx={{ mt: 0.6, fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}>
        {verdict}
      </Typography>

      {strugglingCount > 0 && (
        <Typography sx={{ mt: 0.15, fontSize: '0.76rem', color: 'text.secondary' }}>
          {struggling.text
            ? t('strugglingWithNames', { count: strugglingCount, names: struggling.text })
            : t('struggling', { count: strugglingCount })}
        </Typography>
      )}
    </Box>
  );
}
