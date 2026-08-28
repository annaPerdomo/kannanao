'use client';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

/**
 * One quiet line for the apiCache stale-fallback: the data on screen is what we
 * saved earlier, not what the backend just said. Deliberately not a banner —
 * the content is still useful, so this must not compete with it.
 */
export function StaleDataHint({ show }: { show: boolean }) {
  const t = useTranslations('Common.dataError');
  if (!show) return null;
  return (
    <Typography
      role="status"
      sx={{ fontSize: '0.7rem', color: 'text.secondary', textAlign: 'center', mb: 1 }}
    >
      {t('staleHint')}
    </Typography>
  );
}
