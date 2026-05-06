'use client';

import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import HideImageIcon from '@mui/icons-material/HideImage';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import {
  Box,
  CircularProgress,
  Collapse,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useRef, useState } from 'react';
import { toRomaji } from 'wanakana';

import { ConfirmRemoveImageDialog } from '@/components/ConfirmRemoveImageDialog';
import {
  deleteStorageImage,
  encodeUnsplashUrl,
  fetchImage,
  formatFurigana,
  isStorageImage,
  triggerUnsplashDownload,
  uploadImage,
} from '@/services/api';
import type { Flashcard, JlptLevel } from '@/types/flashcard';

import { SmallField } from './SmallField';
import { compactToggleSx } from './styles';

export type PendingCard = Omit<Flashcard, 'id' | 'deckId'> & { image_query: string };

const JLPT_LEVELS: (JlptLevel | 'none')[] = ['N5', 'N4', 'N3', 'N2', 'N1', 'none'];

interface CardRowProps {
  card: PendingCard;
  originalExampleJp: string;
  index: number;
  expanded: boolean;
  onToggleExpand: (index: number) => void;
  onUpdate: (index: number, patch: Partial<PendingCard>) => void;
  onDelete: (index: number) => void;
}

export function CardRow({
  card,
  originalExampleJp,
  index,
  expanded,
  onToggleExpand,
  onUpdate,
  onDelete,
}: CardRowProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const [refreshingImage, setRefreshingImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formattingFurigana, setFormattingFurigana] = useState(false);
  const [imageQuery, setImageQuery] = useState(card.image_query || card.word);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageBusy = refreshingImage || uploading;
  const exampleJpEdited = card.example_jp !== originalExampleJp;

  const handleRefreshImage = useCallback(async () => {
    const query = imageQuery.trim() || card.word;
    if (!query) return;
    setRefreshingImage(true);
    try {
      const result = await fetchImage(query);
      if (result) {
        triggerUnsplashDownload(result.downloadLocation);
        onUpdate(index, { imageUrl: encodeUnsplashUrl(result) });
      }
    } catch {
      // keep existing image if fetch fails
    } finally {
      setRefreshingImage(false);
    }
  }, [imageQuery, card.word, index, onUpdate]);

  const handleUploadImage = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const url = await uploadImage(file);
        onUpdate(index, { imageUrl: url });
      } catch {
        // keep existing image if upload fails
      } finally {
        setUploading(false);
      }
    },
    [index, onUpdate],
  );

  const handleRemoveClick = useCallback(() => {
    if (isStorageImage(card.imageUrl)) {
      setConfirmOpen(true);
    } else {
      onUpdate(index, { imageUrl: undefined });
    }
  }, [card.imageUrl, index, onUpdate]);

  const handleConfirmRemove = useCallback(async () => {
    setDeleting(true);
    try {
      if (isStorageImage(card.imageUrl)) {
        await deleteStorageImage(card.imageUrl!);
      }
      onUpdate(index, { imageUrl: undefined });
      setConfirmOpen(false);
    } catch {
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [card.imageUrl, index, onUpdate]);

  const handleAutoFurigana = useCallback(async () => {
    if (!card.example_jp.trim()) return;
    setFormattingFurigana(true);
    try {
      const [formatted] = await formatFurigana([card.example_jp]);
      onUpdate(index, { example_jp: formatted });
    } catch {
      // keep existing text on failure
    } finally {
      setFormattingFurigana(false);
    }
  }, [card.example_jp, index, onUpdate]);

  const handleField = (key: keyof PendingCard) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(index, { [key]: e.target.value });
  };

  const titleText =
    card.mainViewMode === 'kanji'
      ? card.word
      : card.mainViewMode === 'romaji'
        ? card.reading
          ? toRomaji(card.reading)
          : card.word
        : card.reading || card.word;
  const subtitleText =
    card.mainViewMode === 'kanji' && card.reading
      ? card.reading
      : card.mainViewMode === 'romaji'
        ? card.word
        : card.meaning;

  const toggleSx = compactToggleSx(theme);

  return (
    <Box
      sx={{
        border: `1.5px solid ${alpha(brand[300], 0.3)}`,
        borderRadius: '14px',
        bgcolor: brand[50],
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease',
        '&:hover': { boxShadow: `0 2px 12px ${alpha(brand[300], 0.18)}` },
      }}
    >
      {/* Summary row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 1.5,
          py: 1,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => onToggleExpand(index)}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '8px',
            flexShrink: 0,
            overflow: 'hidden',
            bgcolor: alpha(brand[300], 0.12),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {card.imageUrl ? (
            <Box
              component="img"
              src={card.imageUrl}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Typography sx={{ fontSize: '0.7rem', color: alpha(brand[700], 0.6) }}>—</Typography>
          )}
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            noWrap
            sx={{ fontSize: '0.88rem', fontWeight: 800, color: brand[800], lineHeight: 1.25 }}
          >
            {titleText}
          </Typography>
          <Typography
            noWrap
            sx={{
              fontSize: '0.72rem',
              color: alpha(brand[700], 0.6),
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {subtitleText}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: -0.5 }}>
          <Tooltip title="Remove card">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(index);
              }}
              sx={{
                width: 24,
                height: 24,
                color: 'rgba(248,113,113,0.5)',
                '&:hover': { color: '#F87171', bgcolor: 'rgba(248,113,113,0.08)' },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" sx={{ color: alpha(brand[700], 0.6) }}>
            {expanded ? (
              <ExpandLessIcon sx={{ fontSize: 18 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Box>
      </Box>

      {/* Expanded edit area */}
      <Collapse in={expanded}>
        <Box
          sx={{
            px: 1.5,
            pb: 1.5,
            pt: 1,
            borderTop: `1px solid ${alpha(brand[300], 0.2)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {/* Image section */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '10px',
                overflow: 'hidden',
                flexShrink: 0,
                bgcolor: alpha(brand[300], 0.08),
                border: `1px solid ${alpha(brand[300], 0.25)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {refreshingImage && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: alpha(brand[50], 0.8),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                  }}
                >
                  <CircularProgress size={20} sx={{ color: brand[500] }} />
                </Box>
              )}
              {card.imageUrl ? (
                <Box
                  component="img"
                  src={card.imageUrl}
                  alt=""
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <ImageSearchIcon sx={{ fontSize: 28, color: alpha(brand[300], 0.4) }} />
              )}
            </Box>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: brand[500],
                }}
              >
                Image Search
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                <TextField
                  size="small"
                  value={imageQuery}
                  onChange={(e) => setImageQuery(e.target.value)}
                  placeholder="Search term…"
                  sx={{
                    flexGrow: 1,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      '& fieldset': { borderColor: alpha(brand[300], 0.35) },
                      '&:hover fieldset': { borderColor: brand[400] },
                      '&.Mui-focused fieldset': { borderColor: brand[500], borderWidth: '1.5px' },
                    },
                    '& .MuiOutlinedInput-input': { py: '6px', px: '10px' },
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      handleRefreshImage();
                    }
                  }}
                />
                <Tooltip title="Fetch from Unsplash">
                  <IconButton
                    size="small"
                    onClick={handleRefreshImage}
                    disabled={imageBusy}
                    sx={{
                      width: 30,
                      height: 30,
                      border: `1.5px solid ${alpha(brand[300], 0.4)}`,
                      borderRadius: '8px',
                      color: brand[500],
                      '&:hover': { bgcolor: alpha(brand[300], 0.1) },
                    }}
                  >
                    {refreshingImage ? (
                      <CircularProgress size={14} sx={{ color: brand[500] }} />
                    ) : (
                      <AutorenewIcon sx={{ fontSize: 16 }} />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Upload image">
                  <IconButton
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageBusy}
                    sx={{
                      width: 30,
                      height: 30,
                      border: `1.5px solid ${alpha(brand[300], 0.4)}`,
                      borderRadius: '8px',
                      color: brand[500],
                      '&:hover': { bgcolor: alpha(brand[300], 0.1) },
                    }}
                  >
                    {uploading ? (
                      <CircularProgress size={14} sx={{ color: brand[500] }} />
                    ) : (
                      <FileUploadIcon sx={{ fontSize: 16 }} />
                    )}
                  </IconButton>
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file);
                    e.target.value = '';
                  }}
                />
                {card.imageUrl && (
                  <Tooltip title="Remove image">
                    <IconButton
                      size="small"
                      onClick={handleRemoveClick}
                      sx={{
                        width: 30,
                        height: 30,
                        border: `1.5px solid ${alpha(brand[300], 0.4)}`,
                        borderRadius: '8px',
                        color: alpha(brand[500], 0.5),
                        '&:hover': { bgcolor: alpha(brand[300], 0.1), color: 'error.main' },
                      }}
                    >
                      <HideImageIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </Box>

          {/* Card settings row */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              flexWrap: 'wrap',
              bgcolor: alpha(brand[300], 0.05),
              border: `1px solid ${alpha(brand[300], 0.18)}`,
              borderRadius: '10px',
              px: 1.25,
              py: 0.75,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  color: alpha(brand[700], 0.6),
                  whiteSpace: 'nowrap',
                }}
              >
                Display:
              </Typography>
              <ToggleButtonGroup
                value={card.mainViewMode}
                exclusive
                size="small"
                onChange={(_, v) => {
                  if (v) onUpdate(index, { mainViewMode: v });
                }}
                sx={toggleSx}
              >
                <ToggleButton value="romaji">A</ToggleButton>
                <ToggleButton value="hiragana">ひ</ToggleButton>
                <ToggleButton value="kanji">漢</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  color: alpha(brand[700], 0.6),
                  whiteSpace: 'nowrap',
                }}
              >
                Type:
              </Typography>
              <ToggleButtonGroup
                value={card.cardType ?? 'word'}
                exclusive
                size="small"
                onChange={(_, v) => {
                  if (v) onUpdate(index, { cardType: v });
                }}
                sx={toggleSx}
              >
                <ToggleButton value="word">Word</ToggleButton>
                <ToggleButton value="phrase">Phrase</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  color: alpha(brand[700], 0.6),
                  whiteSpace: 'nowrap',
                }}
              >
                JLPT:
              </Typography>
              <ToggleButtonGroup
                value={card.jlptLevel ?? 'none'}
                exclusive
                size="small"
                onChange={(_, v) => {
                  if (v) onUpdate(index, { jlptLevel: v === 'none' ? undefined : v });
                }}
                sx={toggleSx}
              >
                {JLPT_LEVELS.map((lvl) => (
                  <ToggleButton key={lvl} value={lvl}>
                    {lvl === 'none' ? '—' : lvl}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Editable fields */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <SmallField label="Word (漢字)" value={card.word} onChange={handleField('word')} />
            <SmallField
              label="Reading (ひらがな)"
              value={card.reading}
              onChange={handleField('reading')}
            />
          </Box>
          <SmallField label="Meaning" value={card.meaning} onChange={handleField('meaning')} />

          <Box sx={{ mt: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                color: alpha(accent[700], 0.7),
                fontWeight: 600,
                mb: 1,
                lineHeight: 1.4,
              }}
            >
              💡 Use{' '}
              <Box
                component="code"
                sx={{
                  bgcolor: alpha(accent[500], 0.08),
                  px: 0.4,
                  borderRadius: '3px',
                  fontSize: '0.58rem',
                }}
              >
                {'{漢字|かんじ}'}
              </Box>{' '}
              to show readings above kanji on the card
            </Typography>
            <SmallField
              label="Example (JP)"
              value={card.example_jp}
              onChange={handleField('example_jp')}
              multiline
              endAdornment={
                exampleJpEdited ? (
                  <Tooltip title="Auto-add furigana markup with AI">
                    <IconButton
                      size="small"
                      onClick={handleAutoFurigana}
                      disabled={formattingFurigana || !card.example_jp.trim()}
                      sx={{ color: accent[500], '&:hover': { bgcolor: alpha(accent[500], 0.08) } }}
                    >
                      {formattingFurigana ? (
                        <CircularProgress size={14} sx={{ color: accent[500] }} />
                      ) : (
                        <AutoFixHighIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                ) : undefined
              }
            />
          </Box>

          <SmallField
            label="Example (EN)"
            value={card.example_en}
            onChange={handleField('example_en')}
            multiline
          />
        </Box>
      </Collapse>

      <ConfirmRemoveImageDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmRemove}
        deleting={deleting}
      />
    </Box>
  );
}
