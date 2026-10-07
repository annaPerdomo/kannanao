'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { Loading } from '@/components/Loading';
import { useHandoutWords } from '@/hooks/useHandoutWords';

interface WordStripProps {
  deckId: string;
  groupId: string;
  onShowDetail: () => void;
}

export function WordStrip({ deckId, groupId, onShowDetail }: WordStripProps) {
  const t = useTranslations('Materials.library.words');
  const tDetail = useTranslations('Group.handoutDetail');
  const { data, loading, error } = useHandoutWords({ groupId, deckId, enabled: true });

  if (loading) return <Loading />;
  if (error) return <Alert severity="error">{tDetail('loadError')}</Alert>;
  if (!data || data.words.length === 0) {
    return <Typography sx={{ fontSize: '0.85rem' }}>{tDetail('noWords')}</Typography>;
  }

  return (
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary', mb: 1 }}>
        {t('inThisWeek', { count: data.words.length })}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.75,
          maxHeight: 112,
          overflowY: 'auto',
          mb: 1.5,
        }}
      >
        {data.words.map(({ card }) => (
          <Chip
            key={card.id}
            label={card.word}
            title={[card.reading !== card.word && card.reading, card.meaning]
              .filter(Boolean)
              .join(' · ')}
            variant="outlined"
            size="small"
            sx={{ color: 'text.primary' }}
          />
        ))}
      </Box>
      <Button onClick={onShowDetail} sx={{ textTransform: 'none', fontWeight: 700 }}>
        {t('seeLearners')}
      </Button>
    </Box>
  );
}
