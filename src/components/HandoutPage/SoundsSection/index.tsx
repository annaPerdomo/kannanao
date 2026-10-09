'use client';
import AbcRounded from '@mui/icons-material/AbcRounded';
import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { SectionCard } from '@/components/Group/SectionCard';
import { useLessonEdits } from '@/hooks/useLessonEdits';
import { setCharacters } from '@/lib/kanaCurriculum';
import { kanaSetLabel, LESSON_KANA_MAX, sortKanaSets, suggestKanaSets } from '@/lib/lessonKana';
import type { Flashcard } from '@/types/flashcard';

import { KanaRowPicker } from './KanaRowPicker';

interface SoundsSectionProps {
  groupId: string;
  deckId: string;
  cards: Flashcard[];
  kanaSets: string[];
  handedOut: boolean;
  onSaved: (message: string) => void;
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export function SoundsSection({
  groupId,
  deckId,
  cards,
  kanaSets,
  handedOut,
  onSaved,
}: SoundsSectionProps) {
  const t = useTranslations('Materials.handoutPage');
  const edits = useLessonEdits(groupId);
  const [optimistic, setOptimistic] = useState<string[] | null>(null);
  const [browsing, setBrowsing] = useState(false);

  const current = optimistic ?? kanaSets;

  useEffect(() => {
    if (optimistic && sameIds(optimistic, kanaSets)) setOptimistic(null);
  }, [kanaSets, optimistic]);

  const atMax = current.length >= LESSON_KANA_MAX;
  const suggestions = useMemo(
    () => (atMax ? [] : suggestKanaSets(cards, current)),
    [cards, current, atMax],
  );

  const save = async (next: string[]) => {
    const sorted = sortKanaSets(next);
    setOptimistic(sorted);
    const ok = await edits.setKanaSets(deckId, sorted);
    if (ok) onSaved(t('soundsSaved'));
    else setOptimistic(null);
  };

  const addSet = (id: string) => void save([...current, id]);
  const removeSet = (id: string) => void save(current.filter((x) => x !== id));
  const addAll = () => void save([...current, ...suggestions]);

  return (
    <SectionCard title={t('soundsTitle')} icon={<AbcRounded sx={{ fontSize: 20 }} />}>
      <Stack spacing={1.5}>
        {edits.error && <Alert severity="error">{edits.error}</Alert>}

        {current.length === 0 ? (
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            🔤 {t('soundsEmpty')}
          </Typography>
        ) : (
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
            {current.map((id) => (
              <Tooltip key={id} title={setCharacters(id) ?? ''} enterTouchDelay={0}>
                <Chip
                  label={kanaSetLabel(id)}
                  onDelete={() => removeSet(id)}
                  disabled={edits.saving}
                  sx={{ fontWeight: 700 }}
                />
              </Tooltip>
            ))}
          </Stack>
        )}

        {suggestions.length > 0 && (
          <Stack spacing={0.75}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {t('soundsSuggested')}
            </Typography>
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
              {suggestions.map((id) => (
                <Tooltip key={id} title={setCharacters(id) ?? ''} enterTouchDelay={0}>
                  <Chip
                    icon={<AddIcon sx={{ fontSize: 16 }} />}
                    label={kanaSetLabel(id)}
                    variant="outlined"
                    onClick={() => addSet(id)}
                    disabled={edits.saving}
                    sx={{ fontWeight: 700 }}
                  />
                </Tooltip>
              ))}
              {suggestions.length >= 2 && (
                <Button
                  size="small"
                  onClick={addAll}
                  disabled={edits.saving}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  {t('soundsAddAll')}
                </Button>
              )}
            </Stack>
          </Stack>
        )}

        {atMax && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {t('soundsMax', { max: LESSON_KANA_MAX })}
          </Typography>
        )}

        <Button
          size="small"
          onClick={() => setBrowsing(true)}
          sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700, px: 0 }}
        >
          {t('soundsBrowse')}
        </Button>

        {handedOut && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {t('soundsLiveHint')}
          </Typography>
        )}
      </Stack>

      <KanaRowPicker
        open={browsing}
        onClose={() => setBrowsing(false)}
        selected={current}
        onDone={(ids) => void save(ids)}
      />
    </SectionCard>
  );
}
