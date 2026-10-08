'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { alpha, type Theme, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';

import { Loading } from '@/components/Loading';
import { useHandoutWords } from '@/hooks/useHandoutWords';
import { isGoalMode } from '@/lib/assignmentMastery';
import type { CardStrength } from '@/lib/cardStrength';
import { type LearnerWordInsight, toCardProgress } from '@/lib/handoutWords';
import { MIXED_SESSION_CARDS, rankCardsForSession } from '@/lib/mixedPractice';

import { formatDate } from '../dueDate';
import { WordRow } from './WordRow';

interface LearnerWordListProps {
  groupId: string;
  deckId: string;
  memberId: string;
  memberName: string;
  requiredMode: string | null;
  onBack?: () => void;
  scroll?: boolean;
}

function strengthColor(strength: CardStrength, theme: Theme): string {
  if (strength === 'strong') return theme.palette.success.main;
  if (strength === 'learning') return theme.palette.warning.main;
  return theme.palette.text.disabled;
}

export function LearnerWordList({
  groupId,
  deckId,
  memberId,
  memberName,
  requiredMode,
  onBack,
  scroll = true,
}: LearnerWordListProps) {
  const t = useTranslations('Group.handoutDetail');
  const theme = useTheme();
  const locale = useLocale();
  const { data, loading, error } = useHandoutWords({ groupId, deckId, memberId, enabled: true });

  if (loading) return <Loading />;
  if (error) return <Alert severity="error">{t('loadError')}</Alert>;
  if (!data || !data.learner) return null;

  const learner = data.learner;
  if (learner.length === 0) {
    return <Typography sx={{ fontSize: '0.85rem' }}>{t('noWords')}</Typography>;
  }

  let strong = 0;
  let learning = 0;
  let unseen = 0;
  for (const insight of learner) {
    if (insight.strength === 'strong') strong++;
    else if (insight.strength === 'learning') learning++;
    else unseen++;
  }

  const cards = learner.map((insight) => insight.card);
  const progress = toCardProgress(learner);
  const byCardId = new Map(learner.map((insight) => [insight.card.id, insight]));
  const ranked = rankCardsForSession(cards, progress)
    .map((card) => byCardId.get(card.id))
    .filter((insight): insight is LearnerWordInsight => insight != null);
  const upNext = ranked.slice(0, MIXED_SESSION_CARDS);
  const showGoalPlaysAll = isGoalMode(requiredMode) && requiredMode !== 'review';

  return (
    <>
      {onBack && (
        <Button size="small" onClick={onBack} sx={{ mb: 1, px: 0 }}>
          {t('backToGroup')}
        </Button>
      )}
      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary', mb: 1 }}>
        {t('learnerSummary', { name: memberName, strong, learning, unseen })}
      </Typography>
      {upNext.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.primary', mb: 0.5 }}>
            {t('upNext', { count: upNext.length })}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mb: 0.5 }}>
            {upNext.map((insight) => (
              <Chip
                key={insight.card.id}
                size="small"
                label={insight.card.word}
                sx={{ color: 'text.primary' }}
              />
            ))}
          </Stack>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {t('upNextHint')}
          </Typography>
          {showGoalPlaysAll && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {t('goalPlaysAll')}
            </Typography>
          )}
        </Box>
      )}
      <Stack
        divider={<Divider flexItem />}
        sx={scroll ? { maxHeight: '50vh', overflowY: 'auto', gap: 0.75, pr: 0.5 } : { gap: 0.75 }}
      >
        {ranked.map((insight) => (
          <WordRow
            key={insight.card.id}
            card={insight.card}
            trailing={
              <>
                <Chip
                  size="small"
                  label={t(`strength.${insight.strength}`)}
                  sx={{
                    color: 'text.primary',
                    bgcolor: alpha(strengthColor(insight.strength, theme), 0.15),
                  }}
                />
                {insight.tricky && (
                  <Chip
                    size="small"
                    label={t('tricky')}
                    sx={{ color: 'text.primary', bgcolor: alpha(theme.palette.warning.main, 0.15) }}
                  />
                )}
                {insight.lastReviewedAt && (
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                    {t('lastSeen', { date: formatDate(insight.lastReviewedAt, locale) })}
                  </Typography>
                )}
              </>
            }
          />
        ))}
      </Stack>
    </>
  );
}
