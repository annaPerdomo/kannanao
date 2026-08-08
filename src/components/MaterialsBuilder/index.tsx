'use client';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import StyleIcon from '@mui/icons-material/Style';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { LAYOUT } from '@/theme';

import { DeckPanel } from './DeckPanel';
import { LessonSetBuilder } from './LessonSetBuilder';

interface MaterialsBuilderProps {
  /** Group to preselect, e.g. when arriving from a group page. */
  initialGroupId?: string;
}

type BuilderTab = 'lessonSet' | 'deck';

/**
 * One organizer-only front door for study materials: a lesson set (decks +
 * schedule + practice sentences) or a single deck.
 */
export function MaterialsBuilder({ initialGroupId }: MaterialsBuilderProps) {
  const t = useTranslations('Materials');
  const tCommon = useTranslations('Common');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { isMemberAccount, loading: authLoading } = useAuth();
  const { groups, loading: groupsLoading, error: groupsError, refetch } = useGroups();

  const [tab, setTab] = useState<BuilderTab>('lessonSet');
  const [groupId, setGroupId] = useState(initialGroupId ?? '');

  if (!authLoading && isMemberAccount) {
    router.push('/');
    return null;
  }

  if (authLoading || groupsLoading) {
    return <Loading message={t('loadingMessage')} />;
  }

  // A stale initialGroupId (deleted group) falls back to the first group.
  const activeGroupId =
    groupId && groups.some((g) => g.id === groupId) ? groupId : (groups[0]?.id ?? '');

  return (
    <Container sx={{ py: { xs: 3, sm: 4 }, maxWidth: LAYOUT.contentMaxWidth }}>
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: theme.radii.lg,
          border: `1px solid ${alpha(brand[300], 0.4)}`,
          background: `linear-gradient(120deg, ${alpha(brand[100], 0.75)}, ${alpha(
            brand[50],
            0.35,
          )} 70%)`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        <Box sx={{ p: { xs: 2.5, sm: 3 }, flex: 1 }}>
          <Typography
            component="h1"
            sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', sm: '1.6rem' } }}
          >
            {t('title')}
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>{t('subtitle')}</Typography>

          <Tabs
            value={tab}
            onChange={(_, next: BuilderTab) => setTab(next)}
            sx={{
              mt: 2,
              minHeight: 0,
              '& .MuiTab-root': {
                minHeight: 0,
                py: 1,
                textTransform: 'none',
                fontWeight: 700,
              },
            }}
          >
            <Tab
              value="lessonSet"
              icon={<CollectionsBookmarkIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={t('tabs.lessonSet')}
            />
            <Tab
              value="deck"
              icon={<StyleIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={t('tabs.deck')}
            />
          </Tabs>
        </Box>
        <Box
          component="img"
          src="/materials/hero-lesson-set.webp"
          alt=""
          sx={{
            width: { xs: 0, md: 300 },
            display: { xs: 'none', md: 'block' },
            objectFit: 'cover',
          }}
        />
      </Paper>

      {/* A failed fetch also leaves `groups` empty — rule it out before telling
          an organizer who has groups to go create one. */}
      {tab === 'lessonSet' && groupsError && (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Alert severity="error">{groupsError}</Alert>
          <Button variant="contained" onClick={() => void refetch()}>
            {tCommon('retry')}
          </Button>
        </Stack>
      )}

      {tab === 'lessonSet' && !groupsError && groups.length === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Alert severity="info">{t('noGroups')}</Alert>
          <Button variant="contained" onClick={() => router.push('/group')}>
            {t('createGroupButton')}
          </Button>
        </Stack>
      )}

      {tab === 'lessonSet' && !groupsError && groups.length > 0 && (
        <LessonSetBuilder groups={groups} groupId={activeGroupId} onGroupChange={setGroupId} />
      )}

      {tab === 'deck' && <DeckPanel />}
    </Container>
  );
}
