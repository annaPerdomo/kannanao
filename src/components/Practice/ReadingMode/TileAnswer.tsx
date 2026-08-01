'use client';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import { Box, IconButton, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { buildKanaTiles } from '@/lib/reviewGames';

interface Tile {
  id: number;
  char: string;
}

interface TileAnswerProps {
  /** The reading being spelled out — one slot per character. */
  target: string;
  /** Answered already: the slots stay on screen but the pool stops responding. */
  locked: boolean;
  /** Fires once, the moment the last slot is filled. */
  onSubmit: (guess: string) => void;
}

export function TileAnswer({ target, locked, onSubmit }: TileAnswerProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const t = useTranslations('Practice.readingMode');

  const [placed, setPlaced] = useState<Tile[]>([]);
  const tiles = useMemo(() => buildKanaTiles(target).map((char, i) => ({ id: i, char })), [target]);
  const usedIds = new Set(placed.map((p) => p.id));

  const handleTile = (tile: Tile) => {
    if (locked || usedIds.has(tile.id) || placed.length >= target.length) return;
    const next = [...placed, tile];
    setPlaced(next);
    if (next.length === target.length) onSubmit(next.map((p) => p.char).join(''));
  };

  const handleBackspace = () => {
    if (locked) return;
    setPlaced((p) => p.slice(0, -1));
  };

  return (
    <Box>
      {/* Answer slots */}
      <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
        {target.split('').map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 52,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 3,
              border: '2px dashed',
              borderColor: placed[i] ? brand[400] : alpha(brand[300], 0.5),
              bgcolor: placed[i] ? alpha(brand[300], 0.14) : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <Typography sx={{ fontFamily: (th) => th.fonts.jp, fontSize: '1.5rem' }}>
              {placed[i]?.char ?? ''}
            </Typography>
          </Box>
        ))}
        <IconButton
          aria-label={t('removeLastCharacter')}
          onClick={handleBackspace}
          disabled={locked || placed.length === 0}
          sx={{ alignSelf: 'center' }}
        >
          <BackspaceOutlinedIcon />
        </IconButton>
      </Box>

      {/* Tile pool */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
        {tiles.map((tile) => {
          const used = usedIds.has(tile.id);
          return (
            <Box
              key={tile.id}
              role="button"
              tabIndex={used || locked ? -1 : 0}
              aria-disabled={used || locked || undefined}
              aria-label={t('placeCharacterAria', { character: tile.char })}
              onClick={() => handleTile(tile)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTile(tile);
                }
              }}
              sx={{
                minWidth: 52,
                height: 52,
                px: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                border: '2px solid',
                borderColor: used ? alpha(brand[200], 0.3) : alpha(brand[200], 0.7),
                bgcolor: used ? 'transparent' : surfaces.input,
                cursor: used || locked ? 'default' : 'pointer',
                opacity: used ? 0.3 : 1,
                transition: 'all 0.15s',
                '&:hover':
                  used || locked
                    ? {}
                    : { borderColor: brand[500], bgcolor: alpha(brand[300], 0.2) },
              }}
            >
              <Typography sx={{ fontFamily: (th) => th.fonts.jp, fontSize: '1.4rem' }}>
                {tile.char}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
