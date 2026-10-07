'use client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Loading } from '@/components/Loading';
import { useGroupMembers } from '@/hooks/useGroup';
import { useHandoutWords } from '@/hooks/useHandoutWords';
import { summarizeGroupWords } from '@/lib/handoutWords';

import { WordRow } from './WordRow';

interface GroupWordListProps {
  groupId: string;
  deckId: string;
  onPickLearner?: (member: { id: string; name: string }) => void;
}

function SeeByLearner({
  groupId,
  onPick,
}: {
  groupId: string;
  onPick: (member: { id: string; name: string }) => void;
}) {
  const t = useTranslations('Group.handoutDetail');
  const [picking, setPicking] = useState(false);
  const { members, loading, errorMessage } = useGroupMembers(groupId, picking);

  if (!picking) {
    return (
      <Button size="small" onClick={() => setPicking(true)} sx={{ mb: 1, px: 0 }}>
        {t('seeByLearner')}
      </Button>
    );
  }

  if (loading) return <Loading />;
  if (errorMessage) return <Alert severity="error">{errorMessage}</Alert>;

  return (
    <Select
      size="small"
      displayEmpty
      value=""
      onChange={(e) => {
        const member = members.find((m) => m.id === e.target.value);
        if (member) onPick({ id: member.id, name: member.displayName || member.username });
      }}
      sx={{ mb: 1, minWidth: 160, fontSize: '0.8rem' }}
      renderValue={() => t('pickLearner')}
      inputProps={{ 'aria-label': t('pickLearner') }}
    >
      {members.map((member) => (
        <MenuItem key={member.id} value={member.id}>
          {member.displayName || member.username}
        </MenuItem>
      ))}
    </Select>
  );
}

export function GroupWordList({ groupId, deckId, onPickLearner }: GroupWordListProps) {
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
      {onPickLearner && <SeeByLearner groupId={groupId} onPick={onPickLearner} />}
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
