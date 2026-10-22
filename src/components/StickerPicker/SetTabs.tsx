'use client';

import LockRoundedIcon from '@mui/icons-material/LockRounded';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { buddyFaceSrc } from '@/lib/buddies';

import type { OrderedStickerSet } from './orderStickerSets';

interface SetTabsProps {
  sets: OrderedStickerSet[];
  selectedKey: string;
  onChange: (buddyKey: string) => void;
}

export function SetTabs({ sets, selectedKey, onChange }: SetTabsProps) {
  const { brand, grey } = useTheme().palette;
  const t = useTranslations('Messages.stickerPicker');
  const tShop = useTranslations('Shop.items');

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.75,
        overflowX: 'auto',
        px: 0.5,
        pb: 0.5,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {sets.map(({ set, owned }) => {
        const selected = set.buddyKey === selectedKey;
        const name = tShop(`${set.buddyKey}.name`);
        return (
          <ButtonBase
            key={set.buddyKey}
            onClick={() => onChange(set.buddyKey)}
            aria-pressed={selected}
            aria-label={owned ? name : t('lockedTabAriaLabel', { name })}
            title={name}
            sx={{
              position: 'relative',
              flexShrink: 0,
              width: 42,
              height: 42,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              border: `2.5px solid ${selected ? brand[600] : alpha(brand[300], 0.4)}`,
              transition: 'transform 0.12s ease, border-color 0.12s ease',
              '&:hover, &:focus-visible': { transform: 'scale(1.08)' },
            }}
          >
            <Box
              component="img"
              src={buddyFaceSrc(set.buddyKey, 1)}
              alt=""
              width={32}
              height={32}
              sx={{
                width: '80%',
                height: '80%',
                objectFit: 'contain',
                ...(!owned && { filter: 'grayscale(1)', opacity: 0.5 }),
              }}
            />
            {!owned && (
              <LockRoundedIcon
                sx={{
                  position: 'absolute',
                  right: -3,
                  bottom: -3,
                  fontSize: 15,
                  p: '2px',
                  borderRadius: '50%',
                  color: 'common.white',
                  bgcolor: grey[500],
                }}
              />
            )}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
