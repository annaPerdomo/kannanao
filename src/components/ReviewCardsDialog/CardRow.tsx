'use client';

import { useState, useCallback } from 'react';
import {
  Box, Typography, IconButton, TextField, Tooltip,
  CircularProgress, Collapse, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import type { Flashcard, JlptLevel } from '@/types/flashcard';
import { fetchImage, formatFurigana } from '@/services/api';
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

export function CardRow({ card, originalExampleJp, index, expanded, onToggleExpand, onUpdate, onDelete }: CardRowProps) {
  const [refreshingImage, setRefreshingImage] = useState(false);
  const [formattingFurigana, setFormattingFurigana] = useState(false);
  const [imageQuery, setImageQuery] = useState(card.image_query || card.word);

  const exampleJpEdited = card.example_jp !== originalExampleJp;

  const handleRefreshImage = useCallback(async () => {
    const query = imageQuery.trim() || card.word;
    if (!query) return;
    setRefreshingImage(true);
    try {
      const url = await fetchImage(query);
      onUpdate(index, { imageUrl: url ?? undefined });
    } catch {
      // keep existing image if fetch fails
    } finally {
      setRefreshingImage(false);
    }
  }, [imageQuery, card.word, index, onUpdate]);

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
    card.mainViewMode === 'kanji' ? card.word : card.reading || card.word;
  const subtitleText =
    card.mainViewMode === 'kanji' && card.reading ? card.reading : card.meaning;

  return (
    <Box
      sx={{
        border: '1.5px solid rgba(249,168,212,0.3)',
        borderRadius: '14px',
        bgcolor: '#FFFBFE',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease',
        '&:hover': { boxShadow: '0 2px 12px rgba(249,168,212,0.18)' },
      }}
    >
      {/* Summary row */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 1.5, py: 1, cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => onToggleExpand(index)}
      >
        <Box
          sx={{
            width: 40, height: 40, borderRadius: '8px', flexShrink: 0,
            overflow: 'hidden', bgcolor: 'rgba(249,168,212,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {card.imageUrl ? (
            <Box component="img" src={card.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Typography sx={{ fontSize: '0.7rem', color: '#C2709A' }}>—</Typography>
          )}
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: '0.88rem', fontWeight: 800, color: '#9D174D', fontFamily: '"Nunito", sans-serif', lineHeight: 1.25 }}>
            {titleText}
          </Typography>
          <Typography noWrap sx={{ fontSize: '0.72rem', color: '#C2709A', fontFamily: '"Nunito", sans-serif', fontWeight: 600, lineHeight: 1.2 }}>
            {subtitleText}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: -0.5 }}>
          <Tooltip title="Remove card">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onDelete(index); }}
              sx={{ width: 24, height: 24, color: 'rgba(248,113,113,0.5)', '&:hover': { color: '#F87171', bgcolor: 'rgba(248,113,113,0.08)' } }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" sx={{ color: '#C2709A' }}>
            {expanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Box>
      </Box>

      {/* Expanded edit area */}
      <Collapse in={expanded}>
        <Box sx={{ px: 1.5, pb: 1.5, pt: 1, borderTop: '1px solid rgba(249,168,212,0.2)', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Image section */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Box
              sx={{
                width: 80, height: 80, borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
                bgcolor: 'rgba(249,168,212,0.08)', border: '1px solid rgba(249,168,212,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
              }}
            >
              {refreshingImage && (
                <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(255,251,254,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <CircularProgress size={20} sx={{ color: '#EC4899' }} />
                </Box>
              )}
              {card.imageUrl ? (
                <Box component="img" src={card.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ImageSearchIcon sx={{ fontSize: 28, color: 'rgba(249,168,212,0.4)' }} />
              )}
            </Box>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#EC4899', fontFamily: '"Nunito", sans-serif' }}>
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
                      borderRadius: '8px', fontSize: '0.78rem', fontFamily: '"Nunito", sans-serif',
                      '& fieldset': { borderColor: 'rgba(249,168,212,0.35)' },
                      '&:hover fieldset': { borderColor: '#F472B6' },
                      '&.Mui-focused fieldset': { borderColor: '#EC4899', borderWidth: '1.5px' },
                    },
                    '& .MuiOutlinedInput-input': { py: '6px', px: '10px' },
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleRefreshImage(); } }}
                />
                <Tooltip title="Fetch new image">
                  <IconButton
                    size="small" onClick={handleRefreshImage} disabled={refreshingImage}
                    sx={{ width: 30, height: 30, border: '1.5px solid rgba(249,168,212,0.4)', borderRadius: '8px', color: '#EC4899', '&:hover': { bgcolor: 'rgba(249,168,212,0.1)' } }}
                  >
                    <AutorenewIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          {/* Card settings row */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'rgba(249,168,212,0.05)', border: '1px solid rgba(249,168,212,0.18)', borderRadius: '10px', px: 1.25, py: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#C2709A', fontFamily: '"Nunito", sans-serif', whiteSpace: 'nowrap' }}>Display:</Typography>
              <ToggleButtonGroup value={card.mainViewMode} exclusive size="small" onChange={(_, v) => { if (v) onUpdate(index, { mainViewMode: v }); }} sx={compactToggleSx}>
                <ToggleButton value="hiragana">ひ</ToggleButton>
                <ToggleButton value="kanji">漢</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#C2709A', fontFamily: '"Nunito", sans-serif', whiteSpace: 'nowrap' }}>Type:</Typography>
              <ToggleButtonGroup value={card.cardType ?? 'word'} exclusive size="small" onChange={(_, v) => { if (v) onUpdate(index, { cardType: v }); }} sx={compactToggleSx}>
                <ToggleButton value="word">Word</ToggleButton>
                <ToggleButton value="phrase">Phrase</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#C2709A', fontFamily: '"Nunito", sans-serif', whiteSpace: 'nowrap' }}>JLPT:</Typography>
              <ToggleButtonGroup value={card.jlptLevel ?? 'none'} exclusive size="small" onChange={(_, v) => { if (v) onUpdate(index, { jlptLevel: v === 'none' ? undefined : v }); }} sx={compactToggleSx}>
                {JLPT_LEVELS.map((lvl) => (
                  <ToggleButton key={lvl} value={lvl}>{lvl === 'none' ? '—' : lvl}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Editable fields */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <SmallField label="Word (漢字)" value={card.word} onChange={handleField('word')} />
            <SmallField label="Reading (ひらがな)" value={card.reading} onChange={handleField('reading')} />
          </Box>
          <SmallField label="Meaning" value={card.meaning} onChange={handleField('meaning')} />

          <Box sx={{ mt: 0.5 }}>
            <Typography sx={{ fontSize: '0.6rem', color: '#9D74B0', fontFamily: '"Nunito", sans-serif', fontWeight: 600, mb: 1, lineHeight: 1.4 }}>
              💡 Use{' '}
              <Box component="code" sx={{ bgcolor: 'rgba(168,85,247,0.08)', px: 0.4, borderRadius: '3px', fontSize: '0.58rem' }}>
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
                      size="small" onClick={handleAutoFurigana}
                      disabled={formattingFurigana || !card.example_jp.trim()}
                      sx={{ color: '#A855F7', '&:hover': { bgcolor: 'rgba(168,85,247,0.08)' } }}
                    >
                      {formattingFurigana
                        ? <CircularProgress size={14} sx={{ color: '#A855F7' }} />
                        : <AutoFixHighIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </Tooltip>
                ) : undefined
              }
            />
          </Box>

          <SmallField label="Example (EN)" value={card.example_en} onChange={handleField('example_en')} multiline />
        </Box>
      </Collapse>
    </Box>
  );
}
