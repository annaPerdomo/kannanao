'use client';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { Loading } from '@/components/Loading';
import type { DifficultWord } from '@/hooks/useDifficultWords';

import { WordRow } from './DifficultWords/WordRow';
import { SectionCard } from './SectionCard';

/** Three is what fits beside the meters without turning the column into the Words tab. */
const SHOWN_WORDS = 3;

interface ReteachNextProps {
  words: DifficultWord[] | undefined;
  loading: boolean;
  error: string | null;
  onViewWords: () => void;
  onOpenMaterials: () => void;
}

export function ReteachNext({
  words,
  loading,
  error,
  onViewWords,
  onOpenMaterials,
}: ReteachNextProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.reteachNext');
  const td = useTranslations('Group.difficultWords');

  const top = (words ?? []).slice(0, SHOWN_WORDS);

  return (
    <SectionCard
      icon={<AutoStoriesOutlinedIcon aria-hidden sx={{ fontSize: '1.15rem', color: brand[600] }} />}
      title={t('heading')}
      footer={
        <Stack spacing={1}>
          <Button
            fullWidth
            size="small"
            variant="text"
            onClick={onViewWords}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              color: brand[700],
              borderRadius: theme.radii.sm,
            }}
          >
            {t('seeAllWords')} →
          </Button>
          <Button
            fullWidth
            size="small"
            variant="contained"
            onClick={onOpenMaterials}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: theme.radii.sm }}
          >
            {t('buildLesson')}
          </Button>
        </Stack>
      }
    >
      {loading ? (
        <Loading message={td('loadingMessage')} />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : top.length === 0 ? (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {td('noTrickyWords')}
        </Typography>
      ) : (
        <Stack divider={<Divider />} spacing={0}>
          {top.map((word) => (
            <WordRow key={word.cardId} word={word} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
