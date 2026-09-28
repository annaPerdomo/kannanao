'use client';
import SaveIcon from '@mui/icons-material/Save';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Loading } from '@/components/Loading';
import type { Group } from '@/hooks/useGroups';
import { useQuizletImport } from '@/hooks/useQuizletImport';
import { isReadyToSave } from '@/lib/quizlet';

import { AssignPicker } from './AssignPicker';
import { BookmarkletSetup } from './BookmarkletSetup';
import { QuizletSetCard } from './QuizletSetCard';

interface QuizletImportProps {
  groups: Group[];
  groupId: string;
  onGroupChange: (groupId: string) => void;
}

export function QuizletImport({ groups, groupId, onGroupChange }: QuizletImportProps) {
  const t = useTranslations('Materials.quizlet');
  const theme = useTheme();
  const { brand } = theme.palette;
  const { sets, saved, loading, saving, error, updateSet, updateCard, removeSet, saveAll } =
    useQuizletImport();
  const [memberIds, setMemberIds] = useState<string[]>([]);

  if (loading) return <Loading />;

  const readyCount = sets.filter(isReadyToSave).length;

  return (
    <Stack spacing={2.5}>
      {error && <Alert severity="error">{error}</Alert>}

      {saved.length > 0 && (
        <Alert severity="success">
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {t('savedTitle', { count: saved.length })}
          </Typography>
          <Stack component="ul" sx={{ m: 0, pl: 2 }}>
            {saved.map((d) => (
              <li key={d.deckId}>
                <Link href={`/deck/${d.deckId}`}>{d.name}</Link>{' '}
                {t(d.assigned ? 'savedLineAssigned' : 'savedLine', { count: d.cardCount })}
              </li>
            ))}
          </Stack>
        </Alert>
      )}

      {sets.length === 0 ? (
        <BookmarkletSetup />
      ) : (
        <>
          {sets.map((set) => (
            <QuizletSetCard
              key={set.url}
              set={set}
              disabled={saving}
              onSetChange={updateSet}
              onCardChange={updateCard}
              onRemove={removeSet}
            />
          ))}

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: theme.radii.lg,
              border: `1px solid ${alpha(brand[300], 0.4)}`,
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={2.5}>
              {groups.length > 0 && (
                <AssignPicker
                  groups={groups}
                  groupId={groupId}
                  onGroupChange={onGroupChange}
                  memberIds={memberIds}
                  onMemberIdsChange={setMemberIds}
                  disabled={saving}
                />
              )}
              <Button
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                disabled={saving || readyCount === 0}
                onClick={() => void saveAll(memberIds.length ? { groupId, memberIds } : null)}
                sx={{ alignSelf: 'flex-start' }}
              >
                {saving ? t('saving') : t('saveButton', { count: readyCount })}
              </Button>
            </Stack>
          </Paper>

          <BookmarkletSetup compact />
        </>
      )}
    </Stack>
  );
}
