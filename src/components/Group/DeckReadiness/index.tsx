'use client';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Loading } from '@/components/Loading';
import { useDeckReadiness } from '@/hooks/useDeckReadiness';
import type { GroupMember } from '@/hooks/useGroup';

import { SectionCard } from '../SectionCard';
import { ShowMoreButton } from '../ShowMoreButton';
import { COLLAPSED_ROWS, tierColors } from './constants';
import { DeckReadinessRow } from './Row';

interface DeckReadinessPanelProps {
  groupId: string;
  members: GroupMember[];
  onViewLearners: () => void;
}

function Legend() {
  const theme = useTheme();
  const t = useTranslations('Group.deckReadiness');
  const tiers = tierColors(theme);

  const entries = [
    { key: 'strong', color: tiers.strong, label: t('legendStrong') },
    { key: 'learning', color: tiers.learning, label: t('legendLearning') },
    { key: 'unseen', color: tiers.unseen, label: t('legendUnseen') },
  ];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mb: 0.5 }}>
      {entries.map((e) => (
        <Box key={e.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: e.color }} />
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{e.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}

/** The plain-words verdict carries the meaning; the meter only reinforces it. */
export function DeckReadinessPanel({ groupId, members, onViewLearners }: DeckReadinessPanelProps) {
  const theme = useTheme();
  const t = useTranslations('Group.deckReadiness');
  const [expanded, setExpanded] = useState(false);
  const { data, loading, error, errorMessage } = useDeckReadiness(groupId);

  const decks = data?.decks ?? [];
  const visible = expanded ? decks : decks.slice(0, COLLAPSED_ROWS);

  return (
    <SectionCard
      icon={
        <TrackChangesOutlinedIcon
          aria-hidden
          sx={{ fontSize: '1.15rem', color: theme.palette.brand[600] }}
        />
      }
      title={t('heading')}
    >
      {loading ? (
        <Loading message={t('loading')} />
      ) : error ? (
        <Alert severity="error">{errorMessage}</Alert>
      ) : decks.length === 0 ? (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{t('empty')}</Typography>
      ) : (
        <Box>
          <Legend />
          <Stack divider={<Divider />} spacing={0}>
            {visible.map((deck) => (
              <DeckReadinessRow
                key={deck.deckId}
                deck={deck}
                members={members}
                onViewLearners={onViewLearners}
              />
            ))}
          </Stack>
          {decks.length > COLLAPSED_ROWS && (
            <ShowMoreButton
              expanded={expanded}
              total={decks.length}
              onClick={() => setExpanded((v) => !v)}
            />
          )}
        </Box>
      )}
    </SectionCard>
  );
}
