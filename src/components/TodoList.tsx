'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import { useTodos } from '@/hooks/useTodos';
import type { Todo } from '@/types/todo';

export const XP_PER_TODO = 5;

const CELEBRATION_MESSAGES = [
  '🎉 Amazing work!', "⭐ You're on fire!", '🌸 So productive!', '✨ Keep it up!',
  '🦋 Unstoppable!', '🌈 You did it!', '💕 Wonderful!', '🎀 Fabulous!',
];
function randomCelebration() {
  return CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
}

function XpPop({ show }: { show: boolean }) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  if (!show) return null;
  return (
    <Box sx={{
      position: 'absolute', top: '-4px', right: 8, pointerEvents: 'none', zIndex: 10,
      fontSize: '0.78rem', fontWeight: 800, color: 'secondary.dark',
      background: `linear-gradient(90deg, ${brand[100]}, ${accent[100]})`,
      border: `1.5px solid ${alpha(accent[300], 0.5)}`,
      borderRadius: 2, px: 0.75, py: 0.25, whiteSpace: 'nowrap',
      animation: 'xp-fly 0.9s ease forwards',
      '@keyframes xp-fly': {
        '0%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        '60%': { opacity: 1, transform: 'translateY(-20px) scale(1.1)' },
        '100%': { opacity: 0, transform: 'translateY(-32px) scale(0.9)' },
      },
    }}>
      +{XP_PER_TODO} XP ✨
    </Box>
  );
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => Promise<boolean>;
  onEdit: (id: string, text: string) => void;
  onEditEmoji: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onXpEarned?: (xp: number) => void;
}

function TodoItem({ todo, onToggle, onEdit, onEditEmoji, onDelete, onXpEarned }: TodoItemProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const [showXp, setShowXp] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const handleToggle = async () => {
    const justCompleted = await onToggle(todo.id);
    if (justCompleted) { setShowXp(true); onXpEarned?.(XP_PER_TODO); setTimeout(() => setShowXp(false), 950); }
  };

  const handleSave = () => {
    if (draft.trim()) onEdit(todo.id, draft); else setDraft(todo.text);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setDraft(todo.text); setEditing(false); }
  };

  return (
    <Box sx={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 1,
      px: 1.5, py: 1, borderRadius: 3,
      background: todo.completed
        ? alpha(brand[300], 0.06)
        : `linear-gradient(120deg, ${brand[50]} 0%, ${accent[50]} 100%)`,
      border: '1.5px solid',
      borderColor: todo.completed ? alpha(accent[300], 0.3) : alpha(brand[400], 0.25),
      transition: 'all 0.25s ease', opacity: todo.completed ? 0.6 : 1,
      animation: 'slide-in 0.3s ease',
      '@keyframes slide-in': { from: { opacity: 0, transform: 'translateY(-6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      '&:hover': {
        borderColor: todo.completed ? alpha(accent[300], 0.5) : alpha(brand[400], 0.5),
        boxShadow: `0 2px 12px ${alpha(brand[400], 0.12)}`,
        '& .todo-actions': { opacity: 1 },
      },
    }}>
      <XpPop show={showXp} />
      <Tooltip title="Change emoji">
        <Box
          component="button"
          onClick={(e) => setEmojiAnchor(e.currentTarget)}
          sx={{
            fontSize: '1.05rem', lineHeight: 1, flexShrink: 0,
            background: 'none', border: 'none', cursor: 'pointer', p: 0.25,
            borderRadius: 1, transition: 'transform 0.15s',
            '&:hover': { transform: 'scale(1.3)' },
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
      <Checkbox checked={todo.completed} onChange={handleToggle} size="small" sx={{
        p: 0.5, color: 'primary.main',
        '&.Mui-checked': { color: 'secondary.dark' },
        '& .MuiSvgIcon-root': { fontSize: '1.15rem' },
      }} />
      {editing ? (
        <TextField
          inputRef={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown} onBlur={handleSave}
          variant="standard" size="small" fullWidth
          sx={{
            '& .MuiInput-root': { fontSize: '0.875rem', fontWeight: 600 },
            '& .MuiInput-underline:before': { borderColor: 'primary.light' },
            '& .MuiInput-underline:after': { borderColor: 'primary.main' },
          }}
        />
      ) : (
        <Typography sx={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: 'text.primary', textDecoration: todo.completed ? 'line-through' : 'none', transition: 'text-decoration 0.2s ease', wordBreak: 'break-word' }}>
          {todo.text}
        </Typography>
      )}
      <Stack className="todo-actions" direction="row" spacing={0} sx={{ flexShrink: 0, opacity: 0, transition: 'opacity 0.2s' }}>
        {editing ? (
          <>
            <Tooltip title="Save"><IconButton size="small" onClick={handleSave} sx={{ color: 'success.main' }}><CheckRoundedIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
            <Tooltip title="Cancel"><IconButton size="small" onClick={() => { setDraft(todo.text); setEditing(false); }} sx={{ color: 'text.secondary' }}><CloseRoundedIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
          </>
        ) : (
          <>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => setEditing(true)} sx={{ color: 'secondary.dark' }}><EditRoundedIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" onClick={() => onDelete(todo.id)} sx={{ color: 'error.main' }}><DeleteRoundedIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
          </>
        )}
      </Stack>
    </Box>
  );
}

interface TodoListProps { onXpEarned?: (xp: number) => void; }

export function TodoList({ onXpEarned }: TodoListProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const { todos, loading, error, addTodo, toggleTodo, editTodo, editEmoji, deleteTodo, clearError } = useTodos();
  const [input, setInput] = useState('');
  const [celebration, setCelebration] = useState('');
  const prevCompleted = useRef(0);

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  useEffect(() => {
    if (totalCount > 0 && completedCount === totalCount && completedCount > prevCompleted.current) {
      setCelebration(randomCelebration());
      const timer = setTimeout(() => setCelebration(''), 3500);
      return () => clearTimeout(timer);
    }
    prevCompleted.current = completedCount;
  }, [completedCount, totalCount]);

  const handleAdd = useCallback(() => {
    if (!input.trim()) return;
    addTodo(input); setInput('');
  }, [input, addTodo]);

  return (
    <Box sx={{
      background: `linear-gradient(160deg, ${alpha(brand[50], 0.8)} 0%, ${alpha(accent[50], 0.8)} 100%)`,
      borderRadius: 4,
      border: `2px solid ${alpha(brand[400], 0.22)}`,
      boxShadow: `0 8px 32px ${alpha(accent[300], 0.18)}, 0 2px 8px ${alpha(brand[400], 0.1)}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Box sx={{
        background: `linear-gradient(135deg, ${alpha(brand[400], 0.18)} 0%, ${alpha(accent[300], 0.22)} 100%)`,
        px: { xs: 2.5, sm: 3 }, pt: 2.5, pb: 2,
        borderBottom: `1.5px solid ${alpha(brand[400], 0.12)}`,
      }}>
        <Stack direction="column" spacing={1.5}>
          {/* Title + progress */}
          <Box sx={{ flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={totalCount > 0 ? 1 : 0}>
              <Typography sx={{ fontSize: '1.3rem' }}>🌸</Typography>
              <Typography variant="h6" sx={{
                fontWeight: 800,
                background: `linear-gradient(90deg, ${brand[700]} 0%, ${accent[500]} 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                My To-Do List
              </Typography>
              <Typography sx={{ fontSize: '1rem' }}>✨</Typography>
              {totalCount > 0 && (
                <Typography variant="caption" sx={{ color: 'secondary.dark', fontWeight: 800, ml: 1 }}>
                  {completedCount}/{totalCount} done
                </Typography>
              )}
            </Stack>
            {totalCount > 0 && (
              <Box sx={{ minWidth: { sm: 220 } }}>
                <LinearProgress
                  variant="determinate" value={progress}
                  sx={{
                    height: 7, borderRadius: 4,
                    bgcolor: alpha(brand[400], 0.12),
                    '& .MuiLinearProgress-bar': {
                      background: progress === 100
                        ? 'linear-gradient(90deg, #34D399, #60C8F5)'
                        : `linear-gradient(90deg, ${brand[400]}, ${accent[300]})`,
                      borderRadius: 4, transition: 'width 0.5s ease',
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5, display: 'block' }}>
                  {progress === 100 ? '🎊 All done!' : `Each task = +${XP_PER_TODO} XP ⭐`}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Add input */}
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Add something fun to do... 🌟" size="small" fullWidth disabled={loading}
              inputProps={{ maxLength: 200 }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: '0.875rem', fontWeight: 600, bgcolor: 'white' } }}
            />
            <Tooltip title="Add (Enter)">
              <span>
                <IconButton onClick={handleAdd} disabled={!input.trim() || loading} sx={{
                  background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                  color: 'white', borderRadius: 2.5, width: 38, height: 38, flexShrink: 0,
                  '&:hover': { background: `linear-gradient(135deg, ${brand[700]}, ${accent[500]})`, transform: 'scale(1.08)' },
                  '&:disabled': { background: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.3)' },
                  transition: 'all 0.2s ease',
                }}>
                  <AddRoundedIcon sx={{ fontSize: '1.2rem' }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* Body */}
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5 }}>
        <Collapse in={!!celebration}>
          <Box sx={{
            textAlign: 'center', py: 1, mb: 1.5, borderRadius: 3,
            background: `linear-gradient(90deg, ${alpha(brand[400], 0.15)}, ${alpha(accent[300], 0.2)}, ${alpha(brand[400], 0.15)})`,
            animation: 'pulse-soft 1s ease infinite',
            '@keyframes pulse-soft': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.75 } },
          }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'secondary.dark' }}>
              {celebration} All done! 🎊
            </Typography>
          </Box>
        </Collapse>

        <Collapse in={!!error}>
          <Alert severity="error" onClose={clearError} sx={{ mb: 1.5, borderRadius: 2.5, fontSize: '0.82rem' }}>{error}</Alert>
        </Collapse>

        {loading ? (
          <Box sx={{ py: 2 }}>
            <LinearProgress sx={{ borderRadius: 2, bgcolor: alpha(brand[400], 0.1), '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${brand[400]}, ${accent[300]})` } }} />
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.secondary' }}>
              Loading your list...
            </Typography>
          </Box>
        ) : todos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 2.5 }}>
            <Typography sx={{ fontSize: '2.2rem', mb: 1 }}>🌸</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', fontWeight: 600 }}>No tasks yet — add one above!</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.5, opacity: 0.7 }}>Complete tasks to earn XP ⭐</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {[...todos.filter((t) => !t.completed), ...todos.filter((t) => t.completed)].map((todo) => (
              <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onEdit={editTodo} onEditEmoji={editEmoji} onDelete={deleteTodo} onXpEarned={onXpEarned} />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
