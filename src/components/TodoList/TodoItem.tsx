'use client';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { memo, useState } from 'react';

import EmojiPicker, { type EmojiClickData, Theme } from '@/components/LazyEmojiPicker';
import type { Todo } from '@/types/todo';

import { getWeekdayNames, isCompletedOnDate, todayISO, XP_PER_TODO } from './helpers';
import { XpPop } from './XpPop';

const MON_TO_SUN_ORDER = [1, 2, 3, 4, 5, 6, 0];

function getFrequencyLabel(
  todo: Todo,
  t: (key: string) => string,
  weekdayByJsDay: string[],
): string | null {
  if (todo.repeatUntilDone) return t('freqDailyUntilDone');
  if (todo.frequencyDays.length === 0) return null;
  if (todo.frequencyDays.length === 7) return t('freqEveryDay');
  if (
    todo.frequencyDays.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => todo.frequencyDays.includes(d))
  )
    return t('freqWeekdays');
  if (todo.frequencyDays.length === 2 && [0, 6].every((d) => todo.frequencyDays.includes(d)))
    return t('freqWeekends');
  const ordered = MON_TO_SUN_ORDER.filter((d) => todo.frequencyDays.includes(d));
  return '↻ ' + ordered.map((d) => weekdayByJsDay[d]).join(' · ');
}

interface TodoItemProps {
  todo: Todo;
  viewDateISO: string;
  onToggle: (id: string, date: string) => Promise<boolean>;
  onEditEmoji: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onAdvancedEdit: (todo: Todo) => void;
  onXpEarned?: (xp: number) => void;
  dragHandle?: React.ReactNode;
}

export const TodoItem = memo(function TodoItem({
  todo,
  viewDateISO,
  onToggle,
  onEditEmoji,
  onDelete,
  onAdvancedEdit,
  onXpEarned,
  dragHandle,
}: TodoItemProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const t = useTranslations('Todo.todoItem');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  const [showXp, setShowXp] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);

  const completed = isCompletedOnDate(todo, viewDateISO);
  const weekdayByJsDay = getWeekdayNames(locale, [0, 1, 2, 3, 4, 5, 6]);
  const frequencyLabel = getFrequencyLabel(todo, t, weekdayByJsDay);

  const handleToggle = async () => {
    const justCompleted = await onToggle(todo.id, viewDateISO);
    if (justCompleted && viewDateISO === todayISO()) {
      setShowXp(true);
      onXpEarned?.(XP_PER_TODO);
      setTimeout(() => setShowXp(false), 950);
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.6,
        borderRadius: 3.5,
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
      }}
    >
      <XpPop show={showXp} />

      {dragHandle}

      {/* Emoji button */}
      <Tooltip title={t('changePicture')}>
        <Box
          component="button"
          onClick={(e) => setEmojiAnchor(e.currentTarget)}
          sx={{
            fontSize: '1.1rem',
            lineHeight: 1,
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            p: 0.25,
            borderRadius: 1,
            transition: 'transform 0.15s',
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
        <Box
          sx={{
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
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
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
          p: 0.4,
          color: brand[300],
          '&.Mui-checked': { color: brand[500] },
          '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
        }}
      />

      {/* Text + frequency indicator */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: completed ? 'text.disabled' : 'text.primary',
            textDecoration: completed ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}
        >
          {todo.text}
        </Typography>
        {frequencyLabel && (
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 500,
              mt: 0.2,
              color: completed ? alpha(brand[300], 0.5) : alpha(brand[500], 0.75),
              letterSpacing: '0.01em',
            }}
          >
            {frequencyLabel}
          </Typography>
        )}
      </Box>

      {/* Action buttons */}
      <Stack
        className="todo-actions"
        direction="row"
        spacing={0}
        sx={{ flexShrink: 0, opacity: 0.3, transition: 'opacity 0.2s' }}
      >
        <Tooltip title={tCommon('edit')}>
          <IconButton size="small" onClick={() => onAdvancedEdit(todo)} sx={{ color: brand[500] }}>
            <EditRoundedIcon sx={{ fontSize: '0.95rem' }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={tCommon('delete')}>
          <IconButton size="small" onClick={() => onDelete(todo.id)} sx={{ color: 'error.main' }}>
            <DeleteRoundedIcon sx={{ fontSize: '0.95rem' }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
});
