'use client';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import { buildQuizletBookmarklet } from '@/lib/quizlet';

interface BookmarkletSetupProps {
  compact?: boolean;
}

export function BookmarkletSetup({ compact = false }: BookmarkletSetupProps) {
  const t = useTranslations('Materials.quizlet');
  const theme = useTheme();
  const { brand } = theme.palette;
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const code = useMemo(
    () =>
      origin
        ? buildQuizletBookmarklet(origin, { notASet: t('notASet'), failed: t('bookmarkletFailed') })
        : '',
    [origin, t],
  );

  // React 19 rewrites javascript: hrefs passed as props, so set it on the DOM node.
  useEffect(() => {
    if (code) linkRef.current?.setAttribute('href', code);
  }, [code]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const steps = [t('step1'), t('step2'), t('step3')];

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: theme.radii.lg,
        border: `1px solid ${alpha(brand[300], 0.4)}`,
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
            {compact ? t('addMoreTitle') : t('setupTitle')}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            {compact ? t('addMoreSubtitle') : t('setupSubtitle')}
          </Typography>
        </Box>

        {!compact && (
          <Box component="ol" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.75, fontSize: '0.9rem' } }}>
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </Box>
        )}

        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ flexWrap: 'wrap', alignItems: 'center' }}
        >
          <Box
            component="a"
            ref={linkRef}
            draggable
            onClick={(e: React.MouseEvent) => e.preventDefault()}
            aria-label={t('bookmarkletAria')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 2,
              py: 1,
              borderRadius: theme.radii.md,
              border: `2px dashed ${brand[400]}`,
              bgcolor: alpha(brand[100], 0.6),
              color: 'text.primary',
              fontWeight: 800,
              textDecoration: 'none',
              cursor: 'grab',
            }}
          >
            <BookmarkAddIcon sx={{ fontSize: 20, color: brand[700] }} />
            {t('bookmarkletLabel')}
          </Box>
          <Button
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={() => void copyCode()}
            disabled={!code}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {copied ? t('copied') : t('copyCode')}
          </Button>
        </Stack>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
          {t('dragHint')}
        </Typography>
      </Stack>
    </Paper>
  );
}
