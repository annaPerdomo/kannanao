'use client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { SectionCard } from '@/components/Group/SectionCard';

interface DraftBannerProps {
  learnerCount: number;
  canHandOut: boolean;
  onHandOut: () => void;
  onDelete: () => Promise<boolean>;
}

export function DraftBanner({ learnerCount, canHandOut, onHandOut, onDelete }: DraftBannerProps) {
  const t = useTranslations('Materials.handoutPage');
  const tLib = useTranslations('Materials.library');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    const ok = await onDelete();
    if (!ok) {
      setError(tLib('saveError'));
      setDeleting(false);
    }
  };

  return (
    <SectionCard compact title={t('draftTitle')} icon={<span aria-hidden="true">📝</span>}>
      <Stack spacing={1.25} sx={{ pt: 0.5 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {confirmingDelete ? (
          <Stack spacing={1.25}>
            <Typography sx={{ color: 'text.primary', fontSize: '0.9rem' }}>
              {t('deleteDraftConfirm')}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                {tLib('cancel')}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => void handleDelete()}
                disabled={deleting}
                startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : undefined}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                {tLib('removeButton')}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
              {t('draftBody', { count: learnerCount })}
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                <Button
                  variant="contained"
                  onClick={onHandOut}
                  disabled={!canHandOut}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  {t('handOutButton')}
                </Button>
                {!canHandOut && (
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {t('needsWords')}
                  </Typography>
                )}
              </Stack>
              <Button
                onClick={() => setConfirmingDelete(true)}
                sx={{ textTransform: 'none', color: 'error.main' }}
              >
                {t('deleteDraft')}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </SectionCard>
  );
}
