'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';

import type { FeedItem } from '@/hooks/useGroup';

/** Short relative time ("5m ago", "yesterday") using the viewer's locale. */
function timeAgo(dateStr: string, locale: string, justNowLabel: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return justNowLabel;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  if (mins < 60) return rtf.format(-mins, 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  return rtf.format(-days, 'day');
}

interface FeedRowProps {
  item: FeedItem;
  time: string;
  /** Compact rows stack the timestamp under the text; the full feed keeps it inline. */
  compact?: boolean;
}

function FeedRow({ item, time, compact }: FeedRowProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const avatar = (
    <Box
      sx={{
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.95rem',
        bgcolor: alpha(brand[100], 0.7),
      }}
    >
      {item.emoji}
    </Box>
  );

  const text = (
    <Typography component="span" sx={{ fontWeight: 700 }}>
      {item.memberName}
    </Typography>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: compact ? 'flex-start' : 'center',
        gap: 1.25,
        py: 1,
        borderBottom: `1px solid ${alpha(brand[300], 0.22)}`,
      }}
    >
      {avatar}
      {compact ? (
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
            {text} {item.description}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{time}</Typography>
        </Box>
      ) : (
        <>
          <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.85rem', color: 'text.primary' }}>
            {text} {item.description}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.72rem',
              color: 'text.secondary',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {time}
          </Typography>
        </>
      )}
    </Box>
  );
}

interface ActivityFeedProps {
  items: FeedItem[];
  compact?: boolean;
}

export function ActivityFeed({ items, compact }: ActivityFeedProps) {
  const t = useTranslations('Group.activityFeed');
  const locale = useLocale();

  if (items.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
        {t('noActivity')}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        columnGap: 3,
      }}
    >
      {items.map((item, i) => (
        <FeedRow
          key={`${item.memberId}-${item.timestamp}-${i}`}
          item={item}
          time={timeAgo(item.timestamp, locale, t('justNow'))}
          compact={compact}
        />
      ))}
    </Box>
  );
}
