'use client';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

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
