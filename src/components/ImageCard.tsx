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
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        border: '1px solid rgba(249,168,212,0.35)',
        borderRadius: 3,
        bgcolor: '#FFF4FB',
        transition: 'border-color 0.2s, transform 0.2s',
        '&:hover': { borderColor: '#EC4899', transform: 'translateY(-1px)' },
      }}
    >
      {/* Thumbnail */}
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 2,
          overflow: 'hidden',
          flexShrink: 0,
          bgcolor: 'rgba(249,168,212,0.18)',
        }}
      >
        {card.imageUrl && (
          <Box
            component="img"
            src={card.imageUrl}
            alt={card.word}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </Box>

      {/* Info */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
          <Typography
            sx={{
              fontFamily: '"Noto Serif JP", serif',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            {card.word}
          </Typography>
          <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.04em' }}>
            {card.reading}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" noWrap>
          {card.meaning}
        </Typography>
      </Box>

      {onDelete && (
        <IconButton size="small" onClick={() => onDelete(card.id)} sx={{ flexShrink: 0 }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}
