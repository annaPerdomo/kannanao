'use client';
import type { SvgIconComponent } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { CreateDeckDialog } from '@/components/CreateDeckDialog';

function FeatureRow({
  icon: Icon,
  label,
  hint,
}: {
  icon: SvgIconComponent;
  label: string;
  hint: string;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: theme.radii.sm,
          bgcolor: alpha(brand[100], 0.7),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 20, color: brand[700] }} />
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{hint}</Typography>
      </Box>
    </Stack>
  );
}

/**
 * The "single deck" tab — opens the same CreateDeckDialog the Decks page uses,
 * so the AI-generate / PDF-import / copy flows never fork.
 */
export function DeckPanel() {
  const t = useTranslations('Materials.deckPanel');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: theme.radii.lg,
        border: `1px solid ${alpha(brand[300], 0.4)}`,
        bgcolor: 'background.paper',
        maxWidth: 560,
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
            {t('title')}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            {t('subtitle')}
          </Typography>
        </Box>

        <Box
          component="img"
          src="/materials/hero-deck.webp"
          alt=""
          sx={{
            width: '100%',
            maxHeight: 180,
            objectFit: 'cover',
            borderRadius: theme.radii.md,
          }}
        />

        <Stack spacing={1.5}>
          <FeatureRow icon={AutoAwesomeIcon} label={t('aiRow')} hint={t('aiHint')} />
          <FeatureRow icon={PictureAsPdfIcon} label={t('pdfRow')} hint={t('pdfHint')} />
          <FeatureRow icon={ContentCopyIcon} label={t('copyRow')} hint={t('copyHint')} />
        </Stack>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            {t('createButton')}
          </Button>
          <Button
            onClick={() => router.push('/decks')}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {t('seeDecksButton')}
          </Button>
        </Stack>
      </Stack>

      <CreateDeckDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Paper>
  );
}
