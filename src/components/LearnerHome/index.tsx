'use client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DataErrorState } from '@/components/DataErrorState';
import { GameTiles } from '@/components/Games';
import { LeaderboardWidget } from '@/components/Group';
import { getGreeting, GreetingHero, XpProgressCard } from '@/components/Home';
import { TodayAdventureCard } from '@/components/TodayAdventureCard';
import { useAuth } from '@/contexts/AuthContext';
import { useProgressCtx } from '@/contexts/ProgressContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useDecks } from '@/hooks/useDecks';
import { useGroupLeaderboards } from '@/hooks/useGroupLeaderboards';
import { useStartAssignmentQuest } from '@/hooks/usePracticeChain';
import { LAYOUT } from '@/theme';

import { CollectionTeaser } from './CollectionTeaser';
import { LessonCard } from './LessonCard';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 1.25 }}>
      {children}
    </Typography>
  );
}

export function LearnerHome() {
  const t = useTranslations('LearnerHome');
  const tGreeting = useTranslations('Home.greeting');
  const router = useRouter();
  const { user, displayName, isInGroup, groupShowLeaderboard } = useAuth();
  const { progress } = useProgressCtx();
  const { decks, loading: decksLoading } = useDecks(true);
  const {
    assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = useAssignments(undefined, isInGroup, 'mine');
  const { boards } = useGroupLeaderboards(groupShowLeaderboard && isInGroup);
  const startQuest = useStartAssignmentQuest();
  const [gamesOpen, setGamesOpen] = useState(false);

  const username = displayName ?? user?.email?.split('@')[0] ?? 'there';
  const pending = assignments.filter((a) => !a.completed_at);

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.contentMaxWidth,
        mx: 'auto',
        px: { xs: 2, sm: 2, lg: 1 },
        py: { xs: 3, sm: 5 },
      }}
    >
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <GreetingHero
          greeting={getGreeting(username, tGreeting)}
          aside={
            progress ? (
              <XpProgressCard
                level={progress.level}
                totalXp={progress.total_xp}
                onShopClick={() => router.push('/me?tab=shop')}
              />
            ) : (
              <Skeleton
                variant="rounded"
                height={94}
                sx={{
                  borderRadius: (t) => t.radii.md,
                  bgcolor: (t) => alpha(t.palette.brand[100], 0.6),
                }}
              />
            )
          }
        >
          <TodayAdventureCard />
        </GreetingHero>
      </Box>

      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', mb: { xs: 3, sm: 4 } }}>
        <CollectionTeaser decks={decks} decksLoading={decksLoading} />
      </Box>

      <Box
        sx={{
          maxWidth: LAYOUT.narrowMaxWidth,
          mx: 'auto',
          display: 'grid',
          gap: { xs: 3, sm: 4 },
          // minmax(0, …): a grid track's auto minimum is its content's width,
          // and a no-wrap lesson title would push the column past the phone.
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: isInGroup && boards.length > 0 ? 'minmax(0, 3fr) minmax(0, 2fr)' : 'minmax(0, 1fr)',
          },
          '& > *': { minWidth: 0 },
        }}
      >
        {isInGroup && (
          <Box>
            <SectionTitle>{t('homeworkTitle')}</SectionTitle>
            {assignmentsError && assignments.length === 0 ? (
              <DataErrorState
                error={assignmentsError}
                onRetry={() => void refetchAssignments()}
                dense
              />
            ) : assignmentsLoading && assignments.length === 0 ? (
              <Skeleton variant="rounded" height={88} sx={{ borderRadius: 3 }} />
            ) : pending.length > 0 ? (
              <Stack spacing={1.5}>
                {pending.map((a) => (
                  <LessonCard
                    key={a.id}
                    assignment={a}
                    onStart={(assignment) =>
                      startQuest(
                        assignment,
                        decks.find((d) => d.id === assignment.deck_id),
                      )
                    }
                  />
                ))}
              </Stack>
            ) : (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  textAlign: 'center',
                  bgcolor: (t) => alpha(t.palette.brand[50], 0.6),
                  border: (t) => `1.5px dashed ${alpha(t.palette.brand[300], 0.5)}`,
                }}
              >
                <Typography sx={{ fontSize: '2rem', lineHeight: 1, mb: 0.5 }} aria-hidden>
                  🌸
                </Typography>
                <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {t('homeworkDone')}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {isInGroup && boards.length > 0 && (
          <Box>
            <SectionTitle>{t('leaderboardTitle')}</SectionTitle>
            <Stack spacing={boards.length > 1 ? 2 : 0}>
              {boards.map((board) => (
                <Box key={board.groupId}>
                  {boards.length > 1 && (
                    <Typography
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'text.secondary',
                        mb: 0.75,
                      }}
                    >
                      {board.groupEmoji ? `${board.groupEmoji} ` : ''}
                      {board.groupName}
                    </Typography>
                  )}
                  <LeaderboardWidget entries={board.entries} compact maxVisible={5} />
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', mt: { xs: 3, sm: 4 } }}>
        <Button
          onClick={() => setGamesOpen((open) => !open)}
          aria-expanded={gamesOpen}
          aria-controls="learner-extra-games"
          endIcon={
            <ExpandMoreIcon
              sx={{
                transform: gamesOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          }
          sx={{ fontWeight: 800, color: 'text.primary' }}
        >
          {t('extraGames')}
        </Button>
        <Collapse in={gamesOpen} id="learner-extra-games">
          <Box sx={{ pt: 1.5 }}>
            <GameTiles />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
