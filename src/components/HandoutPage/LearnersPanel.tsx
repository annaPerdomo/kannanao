'use client';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { formatDate } from '@/components/Group/dueDate';
import { SectionCard } from '@/components/Group/SectionCard';
import { type HandoutLearnerSummary, type MasteryLevel, masteryOf } from '@/lib/handoutWords';

interface LearnersPanelProps {
  groupId: string;
  learners: HandoutLearnerSummary[];
  selectedId: string | null;
  onSelect: (learner: HandoutLearnerSummary) => void;
  onAssign: (learner: HandoutLearnerSummary) => void;
  assigningId: string | null;
}

function sortKey(learner: HandoutLearnerSummary): number {
  return learner.assigned ? masteryOf(learner).percent : 101;
}

export function LearnersPanel({
  groupId,
  learners,
  selectedId,
  onSelect,
  onAssign,
  assigningId,
}: LearnersPanelProps) {
  const t = useTranslations('Materials.handoutPage');
  const locale = useLocale();
  const theme = useTheme();
  const { brand, success, warning, info, text } = theme.palette;

  const sorted = useMemo(() => [...learners].sort((a, b) => sortKey(a) - sortKey(b)), [learners]);

  const levelColor: Record<MasteryLevel, string> = {
    notStarted: text.disabled,
    learning: warning.main,
    gettingThere: info.main,
    mastered: success.main,
  };

  return (
    <SectionCard title={t('learnersTitle', { count: learners.length })}>
      {learners.length === 0 ? (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {t('noLearners')}
        </Typography>
      ) : (
        <>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
            {t('learnersHint')}
          </Typography>
          <Stack spacing={0.75}>
            {sorted.map((learner) => {
              const mastery = masteryOf(learner);
              const chipColor = learner.assigned ? levelColor[mastery.level] : text.disabled;
              const total = learner.strong + learner.learning + learner.unseen;
              const selected = learner.id === selectedId;
              const assigning = assigningId === learner.id;
              return (
                <Box
                  key={learner.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  onClick={() => onSelect(learner)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(learner);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: theme.radii.md,
                    cursor: 'pointer',
                    border: `1px solid ${alpha(brand[300], selected ? 0.9 : 0.3)}`,
                    bgcolor: selected ? alpha(brand[100], 0.6) : 'transparent',
                    '&:hover': { bgcolor: alpha(brand[100], 0.4) },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                      <Typography
                        noWrap
                        sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}
                      >
                        {learner.name}
                      </Typography>
                      {learner.assigned ? (
                        <Chip
                          size="small"
                          label={t('strongPercent', { percent: mastery.percent })}
                          sx={{
                            height: 22,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'text.primary',
                            bgcolor: alpha(chipColor, 0.18),
                            border: `1px solid ${alpha(chipColor, 0.5)}`,
                          }}
                        />
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={assigning}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssign(learner);
                          }}
                          startIcon={
                            assigning ? (
                              <CircularProgress size={12} color="inherit" />
                            ) : (
                              <PersonAddIcon sx={{ fontSize: 14 }} />
                            )
                          }
                          sx={{
                            height: 22,
                            minWidth: 0,
                            px: 1,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            color: 'text.secondary',
                            borderColor: alpha(chipColor, 0.5),
                          }}
                        >
                          {t('assign')}
                        </Button>
                      )}
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={total ? (learner.strong / total) * 100 : 0}
                      aria-label={t('strongOf', { strong: learner.strong, total })}
                      sx={{
                        mt: 0.75,
                        height: 6,
                        borderRadius: theme.radii.pill,
                        bgcolor: alpha(chipColor, 0.15),
                        '& .MuiLinearProgress-bar': { bgcolor: chipColor },
                      }}
                    />
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.5 }}>
                      {[
                        t('strongOf', { strong: learner.strong, total }),
                        learner.tricky > 0 ? t('trickyWords', { count: learner.tricky }) : null,
                        learner.lastPracticedAt
                          ? t('lastPracticed', {
                              date: formatDate(learner.lastPracticedAt, locale),
                            })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    component={Link}
                    href={`/group/${groupId}/members/${learner.id}`}
                    aria-label={t('openLearner', { name: learner.name })}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <OpenInNewIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              );
            })}
          </Stack>
        </>
      )}
    </SectionCard>
  );
}
