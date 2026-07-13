'use client';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import IosShareIcon from '@mui/icons-material/IosShare';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { EmojiPickerPopover } from '@/components/EmojiPickerPopover';
import { PageHeader } from '@/components/PageHeader';
import type { Deck } from '@/types/deck';

interface DeckHeaderProps {
  deck: Deck;
  cardCount: number;
  onBack: () => void;
  onRename: (id: string, name: string, desc?: string) => Promise<void>;
  onPin: (id: string, pinned: boolean) => void;
  onEmbedOpen: () => void;
  onEmojiChange: (id: string, emoji: string | null) => void;
  readOnly?: boolean;
}

export function DeckHeader({
  deck,
  cardCount,
  onBack,
  onRename,
  onPin,
  onEmbedOpen,
  onEmojiChange,
  readOnly,
}: DeckHeaderProps) {
  const t = useTranslations('Deck.deckHeader');
  const tCommon = useTranslations('Common');
  const { brand } = useTheme().palette;

  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [descVal, setDescVal] = useState('');
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(() => {
    setNameVal(deck.name);
    setDescVal(deck.description ?? '');
    setEditing(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [deck]);

  const cancelEdit = useCallback(() => setEditing(false), []);

  const commitEdit = useCallback(async () => {
    const trimmedName = nameVal.trim();
    const trimmedDesc = descVal.trim();
    if (!trimmedName) {
      setEditing(false);
      return;
    }

    const nameChanged = trimmedName !== deck.name;
    const descChanged = trimmedDesc !== (deck.description ?? '');
    if (!nameChanged && !descChanged) {
      setEditing(false);
      return;
    }

    setRenaming(true);
    try {
      await onRename(deck.id, trimmedName, trimmedDesc || undefined);
    } finally {
      setRenaming(false);
      setEditing(false);
    }
  }, [nameVal, descVal, deck, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') void commitEdit();
      if (e.key === 'Escape') cancelEdit();
    },
    [commitEdit, cancelEdit],
  );

  if (editing) {
    return (
      <PageHeader onBack={onBack} title="" mb={3}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              inputRef={nameInputRef}
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={handleKeyDown}
              size="small"
              autoComplete="off"
              disabled={renaming}
              placeholder={t('deckNamePlaceholder')}
              sx={{
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '9px',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: brand[800],
                  bgcolor: alpha('#FFFFFF', 0.6),
                  '& fieldset': { borderColor: alpha(brand[400], 0.5) },
                  '&:hover fieldset': { borderColor: brand[400] },
                  '&.Mui-focused fieldset': { borderColor: brand[500] },
                },
              }}
            />
            {renaming ? (
              <CircularProgress size={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
            ) : (
              <>
                <Tooltip title={t('saveTooltip')}>
                  <IconButton
                    size="small"
                    aria-label={tCommon('save')}
                    onClick={commitEdit}
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '8px',
                      bgcolor: alpha('#FFFFFF', 0.6),
                      border: `1.5px solid ${alpha(brand[400], 0.4)}`,
                      color: brand[700],
                      '&:hover': { bgcolor: alpha('#FFFFFF', 0.8), borderColor: brand[400] },
                    }}
                  >
                    <CheckIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('cancelTooltip')}>
                  <IconButton
                    size="small"
                    aria-label={tCommon('cancel')}
                    onClick={cancelEdit}
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '8px',
                      color: 'text.secondary',
                      border: `1.5px solid ${alpha(brand[300], 0.3)}`,
                      bgcolor: alpha('#FFFFFF', 0.4),
                      '&:hover': { bgcolor: alpha('#FFFFFF', 0.7) },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
          <TextField
            value={descVal}
            onChange={(e) => setDescVal(e.target.value)}
            onKeyDown={handleKeyDown}
            size="small"
            autoComplete="off"
            disabled={renaming}
            placeholder={t('descriptionPlaceholder')}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '9px',
                fontSize: '0.82rem',
                color: brand[600],
                bgcolor: alpha('#FFFFFF', 0.5),
                '& fieldset': { borderColor: alpha(brand[400], 0.35) },
                '&:hover fieldset': { borderColor: brand[400] },
                '&.Mui-focused fieldset': { borderColor: brand[500] },
              },
            }}
          />
        </Box>
      </PageHeader>
    );
  }

  const cardLabel = t('cardCount', { count: cardCount });

  return (
    <>
      <PageHeader
        onBack={onBack}
        title={
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            {readOnly ? (
              <Box
                sx={{
                  fontSize: { xs: '1.4rem', sm: '1.6rem' },
                  alignSelf: 'center',
                  flexShrink: 0,
                }}
              >
                {deck.emoji || ''}
              </Box>
            ) : (
              <Tooltip title={deck.emoji ? t('changeEmojiTooltip') : t('addEmojiTooltip')}>
                <ButtonBase
                  aria-label={deck.emoji ? t('changeDeckEmojiAria') : t('addDeckEmojiAria')}
                  onClick={(e) => setEmojiAnchor(e.currentTarget)}
                  sx={{
                    fontSize: { xs: '1.5rem', sm: '1.75rem' },
                    lineHeight: 1,
                    borderRadius: '10px',
                    p: 0.5,
                    alignSelf: 'center',
                    flexShrink: 0,
                    transition: 'transform 0.15s',
                    '&:hover': { transform: 'scale(1.15)', bgcolor: alpha('#FFFFFF', 0.5) },
                  }}
                >
                  {deck.emoji || ''}
                </ButtonBase>
              </Tooltip>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="h4" sx={{ color: brand[800], lineHeight: 1.1, minWidth: 0 }}>
                  {deck.name}
                </Typography>
                {!readOnly && (
                  <Tooltip title={t('renameDeckTooltip')}>
                    <IconButton
                      size="small"
                      aria-label={t('renameDeckAria')}
                      onClick={startEdit}
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '7px',
                        flexShrink: 0,
                        color: alpha(brand[700], 0.45),
                        '&:hover': { bgcolor: alpha('#FFFFFF', 0.5), color: brand[700] },
                      }}
                    >
                      <EditIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              <Typography variant="body2" sx={{ color: brand[600], mt: 0.25 }}>
                {deck.description ? `${deck.description}  ·  ${cardLabel}` : cardLabel}
              </Typography>
            </Box>
          </Box>
        }
        mb={3}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!readOnly && (
              <Button
                variant={deck.isPublic ? 'outlined' : 'contained'}
                size="small"
                startIcon={
                  deck.isPublic ? (
                    <CheckIcon sx={{ fontSize: 15 }} />
                  ) : (
                    <IosShareIcon sx={{ fontSize: 15 }} />
                  )
                }
                onClick={onEmbedOpen}
                sx={{
                  borderRadius: '9px',
                  px: 2,
                  py: '5px',
                  fontSize: '0.76rem',
                  textTransform: 'none',
                  fontWeight: 700,
                  ...(deck.isPublic && {
                    borderColor: alpha(brand[500], 0.5),
                    color: brand[700],
                    bgcolor: alpha(brand[100], 0.6),
                    '&:hover': {
                      borderColor: brand[500],
                      bgcolor: alpha(brand[100], 0.9),
                    },
                  }),
                }}
              >
                {deck.isPublic ? t('shared') : t('share')}
              </Button>
            )}
            <Tooltip title={deck.pinned ? t('unpinFromHome') : t('pinToHome')}>
              <IconButton
                size="small"
                aria-label={deck.pinned ? t('unpinFromHome') : t('pinToHome')}
                onClick={() => onPin(deck.id, !deck.pinned)}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  border: `1.5px solid ${deck.pinned ? alpha(brand[500], 0.6) : alpha(brand[300], 0.45)}`,
                  bgcolor: deck.pinned ? alpha(brand[100], 0.8) : alpha('#FFFFFF', 0.4),
                  color: deck.pinned ? brand[600] : alpha(brand[500], 0.55),
                  '&:hover': {
                    bgcolor: alpha(brand[100], 0.8),
                    color: brand[600],
                    borderColor: alpha(brand[500], 0.6),
                  },
                }}
              >
                {deck.pinned ? (
                  <PushPinIcon sx={{ fontSize: 14 }} />
                ) : (
                  <PushPinOutlinedIcon sx={{ fontSize: 14 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

      {!readOnly && (
        <EmojiPickerPopover
          anchorEl={emojiAnchor}
          onClose={() => setEmojiAnchor(null)}
          onSelect={(emoji) => onEmojiChange(deck.id, emoji)}
          onRemove={deck.emoji ? () => onEmojiChange(deck.id, null) : undefined}
        />
      )}
    </>
  );
}
