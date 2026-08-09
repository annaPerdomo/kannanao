'use client';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Loading } from '@/components/Loading';
import { useDifficultWords } from '@/hooks/useDifficultWords';

import { SectionCard } from '../SectionCard';
import { ShowMoreButton } from '../ShowMoreButton';
import { ALL_DECKS, COLLAPSED_ROWS } from './constants';
import { WordRow } from './WordRow';

interface DifficultWordsProps {
  groupId: string;
}

function EmptyState({ emoji, body }: { emoji: string; body: string }) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        textAlign: 'center',
        border: `1.5px dashed ${alpha(brand[300], 0.4)}`,
        borderRadius: theme.radii.md,
        bgcolor: alpha(brand[50], 0.6),
      }}
    >
      <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>{emoji}</Typography>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{body}</Typography>
    </Paper>
  );
}

/**
 * The Words tab: every word the group is falling off from, across all their
 * decks at once. Deck-first is the wrong entry point — "what should I reteach?"
 * is rarely a question a teacher can already answer per deck.
 */
export function DifficultWords({ groupId }: DifficultWordsProps) {
  const t = useTranslations('Group.difficultWords');
  const theme = useTheme();
  const { brand } = theme.palette;
  const [deckId, setDeckId] = useState<string>(ALL_DECKS);
  const [expanded, setExpanded] = useState(false);
  const { data, loading, error } = useDifficultWords(groupId, deckId || null);

  const words = data?.words ?? [];
  const visible = expanded ? words : words.slice(0, COLLAPSED_ROWS);
  const decks = data?.decks ?? [];

  return (
    <SectionCard
      icon={<TranslateOutlinedIcon aria-hidden sx={{ fontSize: '1.15rem', color: brand[600] }} />}
      title={t('heading')}
    >
      {decks.length > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' }, mb: 1.5 }}
        >
          <Select
            value={deckId}
            onChange={(e) => {
              setDeckId(e.target.value);
              setExpanded(false);
            }}
            size="small"
            aria-label={t('deckFilterAriaLabel')}
            sx={{
              minWidth: { sm: 200 },
              borderRadius: theme.radii.sm,
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'text.primary',
              bgcolor: alpha(brand[50], 0.7),
              '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(brand[400], 0.4) },
            }}
          >
            <MenuItem value={ALL_DECKS} sx={{ fontSize: '0.85rem' }}>
              {t('allDecks')}
            </MenuItem>
            {decks.map((d) => (
              <MenuItem key={d.id} value={d.id} sx={{ fontSize: '0.85rem' }}>
                {d.emoji || '📚'} {d.name}
              </MenuItem>
            ))}
          </Select>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            {t('contextLine', { count: data?.learnerCount ?? 0 })}
          </Typography>
        </Stack>
      )}

      {loading ? (
        <Loading message={t('loadingMessage')} />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : decks.length === 0 ? (
        <EmptyState emoji="📚" body={t('noDecksBody')} />
      ) : words.length === 0 ? (
        <EmptyState emoji="🎉" body={t('noTrickyWords')} />
      ) : (
        <Box>
          <Stack divider={<Divider />} spacing={0}>
            {visible.map((word) => (
              <WordRow key={word.cardId} word={word} />
            ))}
          </Stack>
          {words.length > COLLAPSED_ROWS && (
            <ShowMoreButton
              expanded={expanded}
              total={words.length}
              onClick={() => setExpanded((v) => !v)}
            />
          )}
        </Box>
      )}
    </SectionCard>
  );
}
