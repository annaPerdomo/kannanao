'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { cardStrength } from '@/lib/cardStrength';
import { getCardProgressForUser } from '@/lib/supabase';
import type { Deck } from '@/types/deck';

interface CollectionTeaserProps {
  decks: Deck[];
  decksLoading: boolean;
}

function CardFan() {
  const { brand, accent } = useTheme().palette;
  const back = (rotate: number, x: number, bg: string) => (
    <Box
      key={rotate}
      sx={{
        position: 'absolute',
        left: '50%',
        bottom: 0,
        width: 44,
        height: 62,
        ml: `${x - 22}px`,
        borderRadius: '8px',
        transform: `rotate(${rotate}deg)`,
        transformOrigin: '50% 100%',
        background: bg,
        border: `2px solid ${alpha('#fff', 0.85)}`,
        boxShadow: `0 4px 10px ${alpha(brand[700], 0.25)}`,
      }}
    />
  );
  return (
    <Box aria-hidden sx={{ position: 'relative', width: 96, height: 70, flexShrink: 0 }}>
      {back(-16, -14, `radial-gradient(circle at 50% 40%, ${accent[400]} 0%, ${accent[700]} 100%)`)}
      {back(0, 0, `radial-gradient(circle at 50% 40%, ${brand[400]} 0%, ${brand[700]} 100%)`)}
      {back(16, 14, 'linear-gradient(145deg, #FDE68A 0%, #F59E0B 60%, #D97706 100%)')}
    </Box>
  );
}

export function CollectionTeaser({ decks, decksLoading }: CollectionTeaserProps) {
  const t = useTranslations('LearnerHome.collection');
  const router = useRouter();
  const { brand } = useTheme().palette;
  const { user } = useAuth();
  const [counts, setCounts] = useState<{ collected: number; strong: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getCardProgressForUser(user.id)
      .then((rows) => {
        if (cancelled) return;
        setCounts({
          collected: rows.length,
          strong: rows.filter((row) => cardStrength(row) === 'strong').length,
        });
      })
      .catch(() => {
        // The teaser is decoration; a failed count hides the numbers, not the door.
        if (!cancelled) setCounts({ collected: 0, strong: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const total = decks.reduce((sum, deck) => sum + deck.cardCount, 0);
  const loading = decksLoading || counts === null;
  const collected = Math.min(counts?.collected ?? 0, total);
  const strong = Math.min(counts?.strong ?? 0, collected);

  return (
    // Pointer convenience only on the strip; the button is the control, and a
    // button nested in a role="button" would lose its accessible name.
    <Box
      onClick={() => router.push('/binder')}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 2.5 },
        p: { xs: 2, sm: 2.5 },
        borderRadius: 4,
        cursor: 'pointer',
        bgcolor: alpha(brand[50], 0.75),
        border: `1.5px solid ${alpha(brand[300], 0.4)}`,
        transition: 'transform 0.15s ease',
        '&:hover': { transform: 'translateY(-2px)' },
      }}
    >
      <CardFan />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.1rem' }, color: 'text.primary' }}
        >
          {t('title')}
        </Typography>
        {loading ? (
          <Skeleton width={180} />
        ) : (
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
            {t('summary', { collected, total })}
            {strong > 0 ? ` · ${t('gold', { count: strong })}` : ''}
          </Typography>
        )}
      </Box>
      <Button
        variant="outlined"
        onClick={(e) => {
          e.stopPropagation();
          router.push('/binder');
        }}
        sx={{ flexShrink: 0, fontWeight: 800, borderRadius: 999 }}
      >
        {t('open')}
      </Button>
    </Box>
  );
}
