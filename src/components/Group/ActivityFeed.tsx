'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import type { FeedItem } from '@/hooks/useGroup';

import { ShowMoreButton } from './ShowMoreButton';

/** Five rows per column at md and up — the card the feed sits in stays a screenful. */
const COLLAPSED_ROWS = 10;

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
  /** Foot of a column at md and up — where the rule would hang under nothing. */
  lastInColumn: boolean;
  lastInList: boolean;
}

function FeedRow({ item, time, lastInColumn, lastInList }: FeedRowProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const rule = `1px solid ${alpha(brand[300], 0.22)}`;

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
        alignItems: 'center',
        gap: 1.25,
        py: 1,
        borderBottom: {
          xs: lastInList ? 'none' : rule,
          md: lastInColumn || lastInList ? 'none' : rule,
        },
      }}
    >
      {avatar}
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
    </Box>
  );
}

interface ActivityFeedProps {
  items: FeedItem[];
}

/**
 * The feed arrives newest-first and is read down a column, so the grid fills
 * column-wise (newspaper order): the default row-wise fill would scatter the
 * sequence left-to-right and make every other item look out of order.
 */
export function ActivityFeed({ items }: ActivityFeedProps) {
  const t = useTranslations('Group.activityFeed');
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
        {t('noActivity')}
      </Typography>
    );
  }

  const visible = expanded ? items : items.slice(0, COLLAPSED_ROWS);
  const perColumn = Math.ceil(visible.length / 2);

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gridTemplateRows: { md: `repeat(${perColumn}, auto)` },
          gridAutoFlow: { md: 'column' },
          columnGap: 4,
        }}
      >
        {visible.map((item, i) => (
          <FeedRow
            key={`${item.memberId}-${item.timestamp}-${i}`}
            item={item}
            time={timeAgo(item.timestamp, locale, t('justNow'))}
            lastInColumn={i === perColumn - 1}
            lastInList={i === visible.length - 1}
          />
        ))}
      </Box>
      {items.length > COLLAPSED_ROWS && (
        <ShowMoreButton
          expanded={expanded}
          total={items.length}
          onClick={() => setExpanded((v) => !v)}
        />
      )}
    </Box>
  );
}
