'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { QuestHandoff } from '@/contexts/QuestHandoffContext';
import { useShopCtx } from '@/contexts/ShopContext';
import { resolveBuddyKey } from '@/lib/buddies';

interface NextUpCardProps {
  handoff: QuestHandoff;
  textColor?: string;
  subTextColor?: string;
  /** 'gradient' for the celebration overlay; 'page' for a plain background. */
  surface?: 'gradient' | 'page';
}

export function NextUpCard({
  handoff,
  textColor = 'text.primary',
  subTextColor = 'text.secondary',
  surface = 'gradient',
}: NextUpCardProps) {
  const t = useTranslations('AssignmentQuest');
  const tItems = useTranslations('Shop.items');
  const { equipped } = useShopCtx();
  const { brand, common } = useTheme().palette;

  if (!handoff.next || !handoff.progress) return null;

  const { done, total } = handoff.progress;
  const name = tItems(`${resolveBuddyKey(equipped['study_buddy'])}.name`);
  const cheerKey =
    done === total - 1
      ? 'cheer.almost'
      : done === 1
        ? 'cheer.start'
        : done * 2 >= total
          ? 'cheer.half'
          : 'cheer.going';
  const [bg, border] =
    surface === 'page'
      ? [alpha(brand[100], 0.55), alpha(brand[300], 0.45)]
      : [alpha(common.white, 0.18), alpha(common.white, 0.35)];

  return (
    <Box
      sx={{
        mt: 2,
        p: 1.25,
        borderRadius: 3,
        bgcolor: bg,
        border: `1.5px solid ${border}`,
        textAlign: 'left',
        animation: 'nextUpFadeIn 0.5s 0.6s ease both',
        '@keyframes nextUpFadeIn': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Typography sx={{ fontSize: '2rem', lineHeight: 1 }} aria-hidden>
          {handoff.next.emoji}
        </Typography>
        <Typography sx={{ fontSize: '0.9rem', color: subTextColor, lineHeight: 1.3 }}>
          {handoff.next.description}
        </Typography>
      </Box>
      <Typography sx={{ mt: 0.75, fontSize: '0.85rem', fontWeight: 700, color: textColor }}>
        {t(cheerKey, { name })}
      </Typography>
    </Box>
  );
}
