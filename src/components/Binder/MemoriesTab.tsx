'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Loading } from '@/components/Loading';
import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { useShopCtx } from '@/contexts/ShopContext';
import { buildMemoryCards, memoryBuddyKeys, type MemoryCardEntry } from '@/lib/binderMemories';
import { resolveBuddyKey } from '@/lib/buddies';

import { CollectedBar, CollectedPanel } from './CollectedBar';
import { MemoryCard } from './MemoryCard';
import { MemoryCardDialog } from './MemoryCardDialog';
import { binderGridSx } from './styles';

export function MemoriesTab() {
  const t = useTranslations('Binder.memories');
  const tItems = useTranslations('Shop.items');
  const tBuddies = useTranslations('Shop.buddies');
  const { equipped: shopEquipped } = useShopCtx();
  const { friendships, loadState, ensureLoaded, refetch } = useBuddyFriendshipCtx();
  const [open, setOpen] = useState<MemoryCardEntry | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const equippedKey = resolveBuddyKey(shopEquipped['study_buddy']);
  const entries = useMemo(
    () =>
      buildMemoryCards(
        memoryBuddyKeys(equippedKey, friendships),
        (key) => friendships[key]?.points ?? 0,
        (key) => {
          try {
            return tBuddies.raw(`${key}.friendship`);
          } catch {
            return null;
          }
        },
      ),
    [equippedKey, friendships, tBuddies],
  );
  const nameOf = useCallback((key: string) => tItems(`${key}.name`), [tItems]);

  const openCard = useCallback(
    (entry: MemoryCardEntry) => {
      if (entry.unlocked) setOpen(entry);
      else setHint(t('lockedHint', { count: entry.heartsAway, name: nameOf(entry.buddyKey) }));
    },
    [t, nameOf],
  );

  if (loadState === 'error') {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        }
      >
        {t('loadFailed')}
      </Alert>
    );
  }
  if (loadState !== 'loaded') return <Loading />;

  const collected = entries.filter((e) => e.unlocked).length;

  return (
    <Stack spacing={{ xs: 2, sm: 2.5 }}>
      <CollectedPanel>
        <Box sx={{ flexGrow: 1 }}>
          <CollectedBar
            collected={collected}
            total={entries.length}
            label={t('collected', { collected, total: entries.length })}
            ariaLabel={t('collectedAria')}
          />
          <Typography sx={{ mt: 1, fontSize: '0.85rem', color: 'text.secondary' }}>
            {collected === 0 ? t('empty') : t('intro')}
          </Typography>
        </Box>
      </CollectedPanel>

      <Box sx={binderGridSx}>
        {entries.map((entry) => (
          <MemoryCard
            key={`${entry.buddyKey}-${entry.level}`}
            entry={entry}
            name={nameOf(entry.buddyKey)}
            onOpen={openCard}
          />
        ))}
      </Box>

      <MemoryCardDialog
        entry={open}
        name={open ? nameOf(open.buddyKey) : ''}
        onClose={() => setOpen(null)}
      />
      <Snackbar
        open={hint !== null}
        autoHideDuration={3000}
        onClose={() => setHint(null)}
        message={hint}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  );
}
