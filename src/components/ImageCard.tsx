'use client';
import { Box, Typography, IconButton } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Flashcard } from '@/types/flashcard';

interface ImageCardProps {
  card: Flashcard;
  onDelete?: (id: string) => void;
}

export function ImageCard({ card, onDelete }: ImageCardProps) {
  return (
    <Box sx={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '12px',
      overflow: 'hidden',
      bgcolor: '#FFFFFF',
      border: '1.5px solid rgba(249,168,212,0.3)',
      boxShadow: '0 1px 4px rgba(249,168,212,0.12), 0 1px 2px rgba(0,0,0,0.04)',
      transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 8px 22px rgba(249,168,212,0.25), 0 2px 6px rgba(0,0,0,0.06)',
        borderColor: 'rgba(244,114,182,0.5)',
      },
      '&:hover .card-delete': { opacity: 1 },
    }}>

      {/* ── Image ── */}
      <Box sx={{
        width: '100%',
        aspectRatio: '4 / 3',
        bgcolor: 'rgba(249,168,212,0.1)',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {card.imageUrl ? (
          <Box
            component="img"
            src={card.imageUrl}
            alt={card.word}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.28s ease',
              '.MuiBox-root:hover > &': { transform: 'scale(1.04)' },
            }}
          />
        ) : (
          <Box sx={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem',
          }}>🌸</Box>
        )}
      </Box>

      {/* ── Divider ── */}
      <Box sx={{ height: '1px', bgcolor: 'rgba(249,168,212,0.28)', flexShrink: 0 }} />

      {/* ── Text footer ── */}
      <Box sx={{
        px: 1.5,
        pt: 1.1,
        pb: 1.4,
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF8FC 100%)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.3, flexWrap: 'wrap' }}>
          <Typography sx={{
            fontFamily: '"Noto Serif JP", serif',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#4A1942',
            lineHeight: 1.2,
          }}>
            {card.word}
          </Typography>
          {card.reading && (
            <Typography sx={{
              fontFamily: '"Nunito", sans-serif',
              fontSize: '0.6rem',
              fontWeight: 700,
              color: '#F472B6',
              letterSpacing: '0.02em',
            }}>
              {card.reading}
            </Typography>
          )}
        </Box>
        <Typography noWrap sx={{
          fontFamily: '"Nunito", sans-serif',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: '#A86C99',
        }}>
          {card.meaning}
        </Typography>
      </Box>

      {/* ── Delete button (hover-only) ── */}
      {onDelete && (
        <IconButton
          className="card-delete"
          size="small"
          onClick={() => onDelete(card.id)}
          sx={{
            position: 'absolute',
            top: 5,
            right: 5,
            opacity: 0,
            transition: 'opacity 0.16s ease',
            bgcolor: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(249,168,212,0.5)',
            borderRadius: '7px',
            width: 24,
            height: 24,
            color: '#EC4899',
            '&:hover': {
              bgcolor: '#FFF0F8',
              color: '#BE185D',
              borderColor: '#F472B6',
            },
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 12 }} />
        </IconButton>
      )}
    </Box>
  );
}