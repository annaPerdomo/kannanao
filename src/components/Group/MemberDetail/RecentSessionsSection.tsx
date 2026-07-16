'use client';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';

import { modeColor, modeLabel } from '@/components/Stats/constants';
import type { MemberSession } from '@/hooks/useGroup';
import { useMemberSessions } from '@/hooks/useGroup';
import type { SessionMode } from '@/hooks/useProgress';

import { formatDate, formatDuration } from './helpers';

interface RecentSessionsSectionProps {
  memberId: string;
  initialSessions: MemberSession[];
}

export function RecentSessionsSection({ memberId, initialSessions }: RecentSessionsSectionProps) {
  const { brand } = useTheme().palette;
  const t = useTranslations('Group.recentSessions');
  const { sessions, loading, loadingMore, hasMore, loadMore } = useMemberSessions(memberId);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const displaySessions = sessions.length > 0 ? sessions : initialSessions;

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMore();
      }
    },
    [hasMore, loadingMore, loadMore],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleIntersect, {
      root: sentinel.parentElement,
      rootMargin: '100px',
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  if (loading && displaySessions.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.85rem',
          color: brand[700],
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          mb: 1.5,
        }}
      >
        {t('heading')}
      </Typography>
      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${alpha(brand[300], 0.3)}`,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            maxHeight: 400,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: alpha(brand[300], 0.4),
              borderRadius: 3,
            },
          }}
        >
          {displaySessions.map((s, i) => {
            const color = modeColor(s.practiceMode as SessionMode);
            const label = modeLabel(s.practiceMode as SessionMode);
            const accuracy =
              s.cardsStudied > 0 ? Math.round((s.cardsCorrect / s.cardsStudied) * 100) : 0;
            const isSpeech = s.practiceMode?.startsWith('speech_');

            return (
              <Box
                key={s.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.25,
                  borderBottom:
                    i < displaySessions.length - 1 ? `1px solid ${alpha(brand[200], 0.5)}` : 'none',
                  transition: 'background 0.15s',
                  '&:hover': { bgcolor: alpha(brand[50], 0.5) },
                }}
              >
                {/* Left: mode chip + stats */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                  <Chip
                    label={label}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      bgcolor: alpha(color, 0.12),
                      color,
                      border: `1px solid ${alpha(color, 0.25)}`,
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                    {s.cardsStudied > 0
                      ? isSpeech
                        ? t('linesStats', { count: s.cardsStudied, accuracy })
                        : t('cardsStats', { count: s.cardsStudied, accuracy })
                      : isSpeech
                        ? t('noLines')
                        : t('noCards')}
                  </Typography>
                </Box>

                {/* Right: XP + meta */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    flexShrink: 0,
                  }}
                >
                  {s.xpEarned > 0 && (
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color }}>
                      {t('xpEarned', { xp: s.xpEarned })}
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                    {formatDuration(s.durationSecs)} · {formatDate(s.startedAt)}
                  </Typography>
                </Box>
              </Box>
            );
          })}

          <Box ref={sentinelRef} sx={{ height: 1 }} />

          {loadingMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
              <CircularProgress size={20} sx={{ color: brand[400] }} />
            </Box>
          )}

          {!hasMore && displaySessions.length > 0 && (
            <Typography
              sx={{
                textAlign: 'center',
                fontSize: '0.65rem',
                color: 'text.secondary',
                py: 1,
              }}
            >
              {t('allLoaded')}
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
