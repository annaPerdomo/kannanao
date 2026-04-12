'use client';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import { useTheme, alpha } from '@mui/material/styles';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import type { Todo } from '@/types/todo';
import { isCompletedOnDate, todayISO, XP_PER_TODO } from './helpers';
import { XpPop } from './XpPop';

interface TodoItemProps {
  todo: Todo;
  viewDateISO: string;
  onToggle: (id: string, date: string) => Promise<boolean>;
  onEditEmoji: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onAdvancedEdit: (todo: Todo) => void;
  onXpEarned?: (xp: number) => void;
}

export function TodoItem({ todo, viewDateISO, onToggle, onEditEmoji, onDelete, onAdvancedEdit, onXpEarned }: TodoItemProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const [showXp, setShowXp] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);

  const completed = isCompletedOnDate(todo, viewDateISO);

  const handleToggle = async () => {
    const justCompleted = await onToggle(todo.id, viewDateISO);
    if (justCompleted && viewDateISO === todayISO()) {
      setShowXp(true);
      onXpEarned?.(XP_PER_TODO);
      setTimeout(() => setShowXp(false), 950);
    }
  };

  return (
    <Box sx={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 0.75,
      px: 1.5, py: 1, borderRadius: 3.5,
      background: completed
        ? alpha(brand[100], 0.3)
        : `linear-gradient(135deg, ${alpha(brand[50], 0.9)} 0%, ${alpha(accent[50], 0.6)} 100%)`,
      border: '2px solid',
      borderColor: completed ? alpha(brand[200], 0.4) : alpha(brand[300], 0.3),
      transition: 'all 0.25s ease',
      opacity: completed ? 0.55 : 1,
      animation: 'slide-in 0.3s ease',
      '@keyframes slide-in': {
        from: { opacity: 0, transform: 'translateY(-4px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      '&:hover': {
        borderColor: brand[400],
        boxShadow: `0 3px 14px ${alpha(brand[300], 0.18)}`,
        transform: 'translateY(-1px)',
        '& .todo-actions': { opacity: 1 },
      },
    }}>
      <XpPop show={showXp} />

      {/* Emoji button */}
      <Tooltip title="Pick emoji">
        <Box
          component="button"
          onClick={(e) => setEmojiAnchor(e.currentTarget)}
          sx={{
            fontSize: '1.1rem', lineHeight: 1, flexShrink: 0,
            background: 'none', border: 'none', cursor: 'pointer', p: 0.25,
            borderRadius: 1, transition: 'transform 0.15s',
            '&:hover': { transform: 'scale(1.3) rotate(-8deg)' },
          }}
        >
          {todo.emoji}
        </Box>
      </Tooltip>

      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{
          '--epr-bg-color': brand[50],
          '--epr-category-label-bg-color': brand[100],
          '--epr-hover-bg-color': alpha(brand[300], 0.25),
          '--epr-focus-bg-color': alpha(brand[300], 0.35),
          '--epr-highlight-color': brand[400],
          '--epr-search-border-color': alpha(brand[400], 0.4),
          '--epr-header-overlay-color': brand[50],
          '--epr-text-color': 'text.primary',
          '--epr-category-icon-active-color': accent[500],
          '--epr-search-input-bg-color': '#fff',
          '--epr-emoji-size': '24px',
          borderRadius: 3, overflow: 'hidden',
        }}>
          <EmojiPicker
            theme={Theme.LIGHT}
            onEmojiClick={(data: EmojiClickData) => {
              onEditEmoji(todo.id, data.emoji);
              setEmojiAnchor(null);
            }}
            lazyLoadEmojis
          />
        </Box>
      </Popover>

      {/* Checkbox */}
      <Checkbox
        checked={completed}
        onChange={handleToggle}
        size="small"
        sx={{
          p: 0.4, color: brand[300],
          '&.Mui-checked': { color: brand[500] },
          '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
        }}
      />

      {/* Text */}
      <Typography sx={{
        flex: 1, fontSize: '0.85rem', fontWeight: 600,
        color: completed ? 'text.disabled' : 'text.primary',
        textDecoration: completed ? 'line-through' : 'none',
        wordBreak: 'break-word',
      }}>
        {todo.text}
      </Typography>

      {/* Action buttons */}
      <Stack className="todo-actions" direction="row" spacing={0} sx={{ flexShrink: 0, opacity: 0, transition: 'opacity 0.2s' }}>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => onAdvancedEdit(todo)} sx={{ color: brand[500] }}><EditRoundedIcon sx={{ fontSize: '0.95rem' }} /></IconButton></Tooltip>
        <Tooltip title="Delete"><IconButton size="small" onClick={() => onDelete(todo.id)} sx={{ color: 'error.main' }}><DeleteRoundedIcon sx={{ fontSize: '0.95rem' }} /></IconButton></Tooltip>
      </Stack>
    </Box>
  );
}
