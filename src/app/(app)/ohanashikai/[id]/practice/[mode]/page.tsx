'use client';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { use } from 'react';

import { Loading } from '@/components/Loading';
import { LineRecallMode } from '@/components/Ohanashikai/LineRecallMode';
import { ReadThroughMode } from '@/components/Ohanashikai/ReadThroughMode';
import { PageHeader } from '@/components/PageHeader';
import { useOhanashikaiLines, useOhanashikais } from '@/hooks/useOhanashikais';
import type { OhanashikaiPracticeMode } from '@/types/ohanashikai';

const VALID_MODES: OhanashikaiPracticeMode[] = ['readthrough', 'linerecall'];

export default function OhanashikaiPracticePage({
  params,
}: {
  params: Promise<{ id: string; mode: string }>;
}) {
  const t = useTranslations('Ohanashikai.practice');
  const { id, mode } = use(params);
  const router = useRouter();
  const theme = useTheme();

  const { ohanashikais } = useOhanashikais();
  const { lines, loading } = useOhanashikaiLines(id);

  const item = ohanashikais.find((o) => o.id === id);
  const practiceMode = mode as OhanashikaiPracticeMode;
  const isValidMode = VALID_MODES.includes(practiceMode);

  const backUrl = `/ohanashikai/${id}`;

  if (!isValidMode) {
    router.replace(backUrl);
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
        <Loading message={t('loadingSession')} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
      <PageHeader
        title={practiceMode === 'readthrough' ? t('readThroughTitle') : t('lineRecallTitle')}
        onBack={() => router.push(backUrl)}
        badge={item?.title ?? ''}
        compact
        mb={3}
      />

      {lines.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            borderRadius: 4,
            border: `1.5px dashed ${alpha(theme.palette.brand[300], 0.45)}`,
            bgcolor: alpha(theme.palette.brand[50], 0.5),
          }}
        >
          <Typography sx={{ fontSize: '2.5rem', mb: 2 }}>📝</Typography>
          <Typography color="text.secondary">{t('noLinesYet')}</Typography>
        </Box>
      ) : (
        <>
          {practiceMode === 'readthrough' && (
            <ReadThroughMode lines={lines} ohanashikaiId={id} onExit={() => router.push(backUrl)} />
          )}
          {practiceMode === 'linerecall' && (
            <LineRecallMode lines={lines} ohanashikaiId={id} onExit={() => router.push(backUrl)} />
          )}
        </>
      )}
    </Box>
  );
}
