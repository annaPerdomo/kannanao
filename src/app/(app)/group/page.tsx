'use client';
import AddIcon from '@mui/icons-material/Add';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { CreateGroupDialog, GroupCard } from '@/components/Group';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { LAYOUT } from '@/theme';

export default function GroupListPage() {
  const t = useTranslations('Group.groupsPage');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { isMemberAccount, loading: authLoading } = useAuth();
  const { groups, loading, error, createGroup, pinGroup } = useGroups();

  const [createOpen, setCreateOpen] = useState(false);

  // Redirect members away
  if (!authLoading && isMemberAccount) {
    router.push('/');
    return null;
  }

  if (loading || authLoading) {
    return (
      <Box sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 6 }}>
        <Loading message={t('loadingGroups')} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.contentMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: { xs: 3, sm: 5 },
      }}
    >
      <Box sx={{ maxWidth: LAYOUT.headerMaxWidth, mx: 'auto' }}>
        <PageHeader
          icon={<Diversity3Icon />}
          title={t('title')}
          subtitle={t('groupCount', { count: groups.length })}
          onBack={() => router.push('/')}
          action={
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => setCreateOpen(true)}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                borderColor: alpha(brand[400], 0.5),
                color: brand[700],
              }}
            >
              {t('newGroupButton')}
            </Button>
          }
        />
      </Box>

      {groups.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: `1.5px dashed ${alpha(brand[300], 0.4)}`,
            borderRadius: 3,
            bgcolor: alpha(brand[50], 0.6),
          }}
        >
          <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>👥</Typography>
          <Typography sx={{ fontWeight: 700, color: brand[700], mb: 0.5 }}>
            {t('noGroupsTitle')}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
            {t('noGroupsBody')}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => setCreateOpen(true)}
            sx={{
              bgcolor: brand[700],
              color: '#fff',
              textTransform: 'none',
              borderRadius: 6,
              '&:hover': { bgcolor: brand[800] },
            }}
          >
            {t('createFirstGroupButton')}
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {groups.map((group) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={group.id}>
              <GroupCard
                group={group}
                onClick={(id) => router.push(`/group/${id}`)}
                onPin={pinGroup}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <CreateGroupDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createGroup}
      />
    </Box>
  );
}
