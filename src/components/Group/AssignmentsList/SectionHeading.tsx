import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

interface SectionHeadingProps {
  label: string;
  count: number;
}

export function SectionHeading({ label, count }: SectionHeadingProps) {
  const t = useTranslations('Group.assignmentsList');
  return (
    <Typography
      component="h3"
      sx={{
        fontSize: '0.78rem',
        fontWeight: 800,
        letterSpacing: '0.02em',
        color: 'text.secondary',
        mt: 0.5,
      }}
    >
      {t('sectionCount', { label, count })}
    </Typography>
  );
}
