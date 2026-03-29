'use client';
import {
  Card,
  CardActionArea,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Chip,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Deck } from '@/types/deck';

interface DeckCardProps {
  deck: Deck;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DeckCard({ deck, onOpen, onDelete }: DeckCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        bgcolor: '#FFF5FB',
        borderRadius: 3,
        border: '1px solid rgba(249,168,212,0.45)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        boxShadow: '0 10px 24px rgba(249,168,212,0.12)',
        '&:hover': {
          boxShadow: '0 18px 36px rgba(249,168,212,0.2)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea sx={{ flexGrow: 1 }} onClick={() => onOpen(deck.id)}>
        <CardContent sx={{ p: 3 }}>
          {/* Decorative kanji mark */}
          <Typography
            sx={{
              fontFamily: '"Noto Serif JP", serif',
              fontSize: '3rem',
              color: 'rgba(249,168,212,0.17)',
              lineHeight: 1,
              mb: 1,
              userSelect: 'none',
            }}
          >
            語
          </Typography>
          <Typography variant="h5" sx={{ color: 'text.primary', mb: 0.5, lineHeight: 1.2 }}>
            {deck.name}
          </Typography>
          {deck.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {deck.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
            <Chip
              label={`${deck.cardCount} card${deck.cardCount !== 1 ? 's' : ''}`}
              size="small"
            />
          </Box>
        </CardContent>
      </CardActionArea>
      <CardActions sx={{ px: 2, pb: 1.5, pt: 0, justifyContent: 'flex-end' }}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(deck.id);
          }}
          aria-label="Delete deck"
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}
