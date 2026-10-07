'use client';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { Loading } from '@/components/Loading';
import { useHandoutWords } from '@/hooks/useHandoutWords';
import { summarizeGroupWords } from '@/lib/handoutWords';

import { WordRow } from './WordRow';

interface GroupWordListProps {
  groupId: string;
  deckId: string;
}

export function GroupWordList({ groupId, deckId }: GroupWordListProps) {
  const t = useTranslations('Group.handoutDetail');
  const theme = useTheme();
  const { success, warning } = theme.palette;
  const { data, loading, error } = useHandoutWords({ groupId, deckId, enabled: true });

  if (loading) return <Loading />;
  if (error) return <Alert severity="error">{t('loadError')}</Alert>;
  if (!data) return null;
  if (data.words.length === 0) {
    return <Typography sx={{ fontSize: '0.85rem' }}>{t('noWords')}</Typography>;
  }

  if (data.learnerCount === 0) {
    return (
      <>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1.5 }}>
          {t('noLearnersYet')}
        </Typography>
        <Stack
          divider={<Divider flexItem />}
          sx={{ maxHeight: '50vh', overflowY: 'auto', gap: 0.75, pr: 0.5 }}
        >
          {data.words.map(({ card }) => (
            <WordRow key={card.id} card={card} />
          ))}
        </Stack>
      </>
    );
  }

  const summary = summarizeGroupWords(data.words, data.learnerCount);

  return (
    <>
      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary', mb: 1 }}>
        {t('groupSummary', {
          seen: summary.seenByAnyone,
          total: summary.total,
          strong: summary.strongForMost,
        })}
      </Typography>
      <Stack
        divider={<Divider flexItem />}
        sx={{ maxHeight: '50vh', overflowY: 'auto', gap: 0.75, pr: 0.5 }}
      >
        {data.words.map((insight) => (
          <WordRow
            key={insight.card.id}
            card={insight.card}
            trailing={
              <>
                <Chip
                  size="small"
                  label={t('seenOf', { seen: insight.seenCount, learners: data.learnerCount })}
                  sx={{ color: 'text.primary' }}
                  variant="outlined"
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
            }
          />
        ))}
      </Stack>
    </>
  );
}
