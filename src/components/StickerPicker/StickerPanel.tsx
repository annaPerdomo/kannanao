'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Loading } from '@/components/Loading';
import { useShopCtx } from '@/contexts/ShopContext';
import { resolveBuddyKey } from '@/lib/buddies';

import { LockedSetBanner } from './LockedSetBanner';
import { orderStickerSets } from './orderStickerSets';
import { SetTabs } from './SetTabs';
import { StickerGrid } from './StickerGrid';

interface StickerPanelProps {
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function StickerPanel({ onSelect, onClose }: StickerPanelProps) {
  const { brand } = useTheme().palette;
  const t = useTranslations('Messages.stickerPicker');
  const { ownsItem, equipped, loading, loadError } = useShopCtx();

  const activeBuddy = resolveBuddyKey(equipped['study_buddy']);
  const sets = useMemo(() => orderStickerSets(activeBuddy, ownsItem), [activeBuddy, ownsItem]);
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const current = sets.find((s) => s.set.buddyKey === chosenKey) ?? sets[0];

  return (
    <Box sx={{ p: 1.5, bgcolor: alpha(brand[50], 0.6) }}>
      <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: brand[700], px: 0.5, pb: 1 }}>
        {t('title')}
      </Typography>
      {loading ? (
        <Box sx={{ height: 46 }} />
      ) : (
        <SetTabs sets={sets} selectedKey={current.set.buddyKey} onChange={setChosenKey} />
      )}
      {/* A FIXED height, not maxHeight: the desktop popover is anchored by its
          bottom edge, so MUI positions it from whatever the panel measures at
          open time. With an elastic height the not-yet-loaded artwork measured
          near zero, MUI placed the panel too low, and it then grew off the
          bottom of the screen as the images arrived. */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          height: { xs: 300, sm: 340 },
          mt: 1,
        }}
      >
        {loading ? (
          <Loading message={t('loading')} />
        ) : (
          <>
            {loadError && !current.owned && <Alert severity="error">{t('loadError')}</Alert>}
            {!loadError && !current.owned && (
              <LockedSetBanner buddyKey={current.set.buddyKey} onClose={onClose} />
            )}
            <StickerGrid
              key={current.set.buddyKey}
              set={current.set}
              locked={!current.owned}
              onSelect={(id) => {
                onSelect(id);
                onClose();
              }}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
