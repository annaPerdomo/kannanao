'use client';
import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { EditCardDialog } from '@/components/EditCardDialog';
import { SectionCard } from '@/components/Group/SectionCard';
import { Loading } from '@/components/Loading';
import { StyledDialog } from '@/components/StyledDialog';
import type { useHandoutWordEdits } from '@/hooks/useHandoutWordEdits';
import type { HandoutWords } from '@/hooks/useHandoutWords';
import { type GroupWordInsight, summarizeGroupWords } from '@/lib/handoutWords';
import type { Flashcard } from '@/types/flashcard';

import { AddWordsFlow } from './AddWordsFlow';
import { matchesFilter, WORD_FILTERS, type WordFilter } from './constants';
import { WordItem } from './WordItem';

interface HandoutWordsPanelProps {
  deckId: string;
  data: HandoutWords | null;
  loading: boolean;
  error: string | null;
  edits: ReturnType<typeof useHandoutWordEdits>;
  onSaved: (message: string) => void;
}

function InsightChips({
  insight,
  learnerCount,
}: {
  insight: GroupWordInsight;
  learnerCount: number;
}) {
  const t = useTranslations('Group.handoutDetail');
  const { success, warning } = useTheme().palette;
  return (
    <>
      <Chip
        size="small"
        variant="outlined"
        label={t('seenOf', { seen: insight.seenCount, learners: learnerCount })}
        sx={{ color: 'text.primary' }}
      />
      {insight.strongCount > 0 && (
        <Chip
          size="small"
          label={t('strongCount', { count: insight.strongCount })}
          sx={{ color: 'text.primary', bgcolor: alpha(success.main, 0.15) }}
        />
      )}
      {insight.trickyCount > 0 && (
        <Chip
          size="small"
          label={t('trickyCount', { count: insight.trickyCount })}
          sx={{ color: 'text.primary', bgcolor: alpha(warning.main, 0.15) }}
        />
      )}
    </>
  );
}

export function HandoutWordsPanel({
  deckId,
  data,
  loading,
  error,
  edits,
  onSaved,
}: HandoutWordsPanelProps) {
  const t = useTranslations('Materials.handoutPage');
  const tDetail = useTranslations('Group.handoutDetail');
  const [filter, setFilter] = useState<WordFilter>('all');
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [removing, setRemoving] = useState<Flashcard | null>(null);
  const [adding, setAdding] = useState(false);

  const learnerCount = data?.learnerCount ?? 0;
  const words = useMemo(() => data?.words ?? [], [data]);
  const counts = useMemo(() => {
    const result = {} as Record<WordFilter, number>;
    for (const f of WORD_FILTERS) {
      result[f] = words.filter((w) => matchesFilter(w, f, learnerCount)).length;
    }
    return result;
  }, [words, learnerCount]);
  const visible = useMemo(
    () => words.filter((w) => matchesFilter(w, filter, learnerCount)),
    [words, filter, learnerCount],
  );

  const handleEdit = useCallback((card: Flashcard) => setEditing(card), []);
  const handleRemove = useCallback((card: Flashcard) => setRemoving(card), []);

  const confirmRemove = async () => {
    if (!removing) return;
    const card = removing;
    setRemoving(null);
    if (await edits.removeWord(card.id)) onSaved(t('wordRemoved'));
  };

  const handleUpdate = async (card: Flashcard) => {
    if (await edits.updateWord(card)) onSaved(t('wordSaved'));
  };

  const handleAdd: typeof edits.addWords = async (cards) => {
    const ok = await edits.addWords(cards);
    if (ok) onSaved(t('wordsAdded', { count: cards.length }));
    return ok;
  };

  const handleCopy: typeof edits.copyWords = async (cards) => {
    const ok = await edits.copyWords(cards);
    if (ok) onSaved(t('wordsAdded', { count: cards.length }));
    return ok;
  };

  const summary =
    data && learnerCount > 0 && words.length > 0 ? summarizeGroupWords(words, learnerCount) : null;

  return (
    <SectionCard
      title={t('wordsTitle', { count: words.length })}
      action={
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAdding(true)}
          disabled={edits.saving || !data}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {t('addWords')}
        </Button>
      }
    >
      {summary && (
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
          {tDetail('groupSummary', {
            seen: summary.seenByAnyone,
            total: summary.total,
            strong: summary.strongForMost,
          })}
        </Typography>
      )}
      {data && learnerCount === 0 && (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {tDetail('noLearnersYet')}
        </Typography>
      )}
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5, mb: 1.5 }}>
        {t('wordsSharedHint')}
      </Typography>

      {edits.error && (
        <Alert severity="error" onClose={edits.clearError} sx={{ mb: 1.5 }}>
          {t('wordSaveError')}
        </Alert>
      )}

      {learnerCount > 0 && words.length > 0 && (
        <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
          {WORD_FILTERS.map((f) => (
            <Chip
              key={f}
              label={t(`filter.${f}`, { count: counts[f] })}
              onClick={() => setFilter(f)}
              color={filter === f ? 'primary' : 'default'}
              variant={filter === f ? 'filled' : 'outlined'}
              aria-pressed={filter === f}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Stack>
      )}

      {loading && !data ? (
        <Loading />
      ) : error && !data ? (
        <Alert severity="error">{tDetail('loadError')}</Alert>
      ) : words.length === 0 ? (
        <Typography sx={{ fontSize: '0.85rem', py: 2 }}>{t('noWordsYet')}</Typography>
      ) : visible.length === 0 ? (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', py: 2 }}>
          {t('noWordsMatch')}
        </Typography>
      ) : (
        <Stack divider={<Divider flexItem />}>
          {visible.map((insight) => (
            <WordItem
              key={insight.card.id}
              card={insight.card}
              disabled={edits.saving}
              onEdit={handleEdit}
              onRemove={handleRemove}
              insight={
                learnerCount > 0 ? (
                  <InsightChips insight={insight} learnerCount={learnerCount} />
                ) : undefined
              }
            />
          ))}
        </Stack>
      )}

      <EditCardDialog
        card={editing}
        open={editing != null}
        onClose={() => setEditing(null)}
        onSave={(updated) => void handleUpdate(updated)}
      />

      <StyledDialog
        open={removing != null}
        onClose={() => setRemoving(null)}
        title={t('removeWordTitle', { word: removing?.word ?? '' })}
        titleId="remove-word-title"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setRemoving(null)} sx={{ textTransform: 'none' }}>
              {t('cancel')}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => void confirmRemove()}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {t('removeWordConfirm')}
            </Button>
          </>
        }
      >
        <Typography sx={{ fontSize: '0.9rem', color: 'text.primary' }}>
          {t('removeWordBody')}
        </Typography>
      </StyledDialog>

      <AddWordsFlow
        open={adding}
        onClose={() => setAdding(false)}
        deckId={deckId}
        onAdd={handleAdd}
        onCopy={handleCopy}
      />
    </SectionCard>
  );
}
