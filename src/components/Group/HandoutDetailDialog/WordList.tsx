'use client';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { Loading } from '@/components/Loading';
import { useDeckWords } from '@/hooks/useDeckWords';

interface WordListProps {
  deckId: string;
}

export function WordList({ deckId }: WordListProps) {
  const t = useTranslations('Group.handoutDetail');
  const { words, loading, error } = useDeckWords(deckId, true);

  if (loading) return <Loading />;
  if (error) return <Alert severity="error">{t('loadError')}</Alert>;
  if (words.length === 0)
    return <Typography sx={{ fontSize: '0.85rem' }}>{t('noWords')}</Typography>;

  return (
    <>
      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>
        {t('wordsCount', { count: words.length })}
      </Typography>
      <Stack
        divider={<Divider flexItem />}
        sx={{ maxHeight: '50vh', overflowY: 'auto', gap: 0.75, pr: 0.5 }}
      >
        {words.map((card) => (
          <Stack key={card.id} sx={{ py: 0.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
              {card.word}
            </Typography>
            {card.reading && card.reading !== card.word && (
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {card.reading}
              </Typography>
            )}
            <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
              {card.meaning}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </>
  );
}
