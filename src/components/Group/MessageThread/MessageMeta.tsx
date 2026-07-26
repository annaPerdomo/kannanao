import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { timeAgoInfo } from './constants';

interface MessageMetaProps {
  createdAt: string;
  isMine: boolean;
  readAt: string | null;
  /** Media bubbles pad their content, so the meta row has to match */
  inset: boolean;
}

/** Relative timestamp plus (for your own messages) the sent/read receipt. */
export function MessageMeta({ createdAt, isMine, readAt, inset }: MessageMetaProps) {
  const { palette } = useTheme();
  const t = useTranslations('Group.messageBubble');
  const tThread = useTranslations('Group.messageThread');

  const info = timeAgoInfo(createdAt);
  const label =
    info.unit === 'justNow'
      ? tThread('justNow')
      : info.unit === 'minutes'
        ? tThread('minutesAgo', { minutes: info.value })
        : info.unit === 'hours'
          ? tThread('hoursAgo', { hours: info.value })
          : info.unit === 'yesterday'
            ? tThread('yesterday')
            : tThread('daysAgo', { days: info.value });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        gap: 0.3,
        mt: 0.3,
        px: inset ? 1 : 0,
        pb: inset ? 0.3 : 0,
      }}
    >
      <Typography component="span" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
        {label}
      </Typography>
      {isMine &&
        (readAt ? (
          <DoneAllIcon
            sx={{ fontSize: 14, color: palette.brand[600] }}
            aria-label={t('readAriaLabel')}
          />
        ) : (
          <DoneIcon sx={{ fontSize: 14, color: 'text.disabled' }} aria-label={t('sentAriaLabel')} />
        ))}
    </Box>
  );
}
