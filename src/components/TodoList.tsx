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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTodos } from '@/hooks/useTodos';
import type { Todo } from '@/types/todo';

const CELEBRATION_MESSAGES = [
  '🎉 Amazing work!',
  '⭐ You\'re on fire!',
  '🌸 So productive!',
  '✨ Keep it up!',
  '🦋 Unstoppable!',
  '🌈 You did it!',
  '💕 Wonderful!',
  '🎀 Fabulous!',
];

function randomCelebration() {
  return CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
}

// Sparkle burst shown briefly after completing a task
function Sparkle({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        fontSize: '1.4rem',
        animation: 'sparkle-pop 0.6s ease forwards',
        '@keyframes sparkle-pop': {
          '0%': { opacity: 1, transform: 'scale(0.5)' },
          '60%': { opacity: 1, transform: 'scale(1.4)' },
          '100%': { opacity: 0, transform: 'scale(1.6)' },
        },
      }}
    >
      ✨
    </Box>
  );
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const [sparkle, setSparkle] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleToggle = () => {
    if (!todo.completed) {
      setSparkle(true);
      setTimeout(() => setSparkle(false), 700);
    }
    onToggle(todo.id);
  };

  const handleSave = () => {
    if (draft.trim()) onEdit(todo.id, draft);
    else setDraft(todo.text);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setDraft(todo.text); setEditing(false); }
  };

  // Cycle through gentle pastel gradients per item emoji
  const itemBg = todo.completed
    ? 'rgba(249,168,212,0.06)'
    : 'linear-gradient(120deg, #FFF5FB 0%, #F3EFFE 100%)';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: 3,
        background: itemBg,
        border: '1.5px solid',
        borderColor: todo.completed ? 'rgba(196,181,253,0.3)' : 'rgba(244,114,182,0.25)',
        transition: 'all 0.25s ease',
        opacity: todo.completed ? 0.65 : 1,
        animation: 'slide-in 0.3s ease',
        '@keyframes slide-in': {
          from: { opacity: 0, transform: 'translateY(-8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '&:hover': {
          borderColor: todo.completed ? 'rgba(196,181,253,0.5)' : 'rgba(244,114,182,0.5)',
          boxShadow: '0 2px 12px rgba(244,114,182,0.12)',
        },
      }}
    >
      <Sparkle show={sparkle} />

      {/* Emoji badge */}
      <Typography sx={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>
        {todo.emoji}
      </Typography>

      {/* Checkbox */}
      <Checkbox
        checked={todo.completed}
        onChange={handleToggle}
        size="small"
        sx={{
          p: 0.5,
          color: 'primary.main',
          '&.Mui-checked': { color: 'secondary.dark' },
          '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
        }}
      />

      {/* Text / edit field */}
      {editing ? (
        <TextField
          inputRef={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          variant="standard"
          size="small"
          fullWidth
          sx={{
            '& .MuiInput-root': { fontSize: '0.9rem', fontWeight: 600 },
            '& .MuiInput-underline:before': { borderColor: 'primary.light' },
            '& .MuiInput-underline:after': { borderColor: 'primary.main' },
          }}
        />
      ) : (
        <Typography
          sx={{
            flex: 1,
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'text.primary',
            textDecoration: todo.completed ? 'line-through' : 'none',
            transition: 'text-decoration 0.2s ease',
            wordBreak: 'break-word',
          }}
        >
          {todo.text}
        </Typography>
      )}

      {/* Action buttons */}
      <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
        {editing ? (
          <>
            <Tooltip title="Save">
              <IconButton size="small" onClick={handleSave} sx={{ color: 'success.main' }}>
                <CheckRoundedIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancel">
              <IconButton size="small" onClick={() => { setDraft(todo.text); setEditing(false); }} sx={{ color: 'text.secondary' }}>
                <CloseRoundedIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => setEditing(true)}
                sx={{ color: 'secondary.dark', opacity: 0, '.MuiBox-root:hover &': { opacity: 1 }, transition: 'opacity 0.2s' }}
              >
                <EditRoundedIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => onDelete(todo.id)}
                sx={{ color: 'error.main', opacity: 0, '.MuiBox-root:hover &': { opacity: 1 }, transition: 'opacity 0.2s' }}
              >
                <DeleteRoundedIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>
    </Box>
  );
}

export function TodoList() {
  const { todos, loading, error, addTodo, toggleTodo, editTodo, deleteTodo, clearError } = useTodos();
  const [input, setInput] = useState('');
  const [celebration, setCelebration] = useState('');
  const prevCompleted = useRef(0);

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Show celebration message when all tasks are done
  useEffect(() => {
    if (totalCount > 0 && completedCount === totalCount && completedCount > prevCompleted.current) {
      setCelebration(randomCelebration());
      const timer = setTimeout(() => setCelebration(''), 3000);
      return () => clearTimeout(timer);
    }
    prevCompleted.current = completedCount;
  }, [completedCount, totalCount]);

  const handleAdd = useCallback(() => {
    if (!input.trim()) return;
    addTodo(input);
    setInput('');
  }, [input, addTodo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #FFF0FA 0%, #F0EBFF 100%)',
        borderRadius: 4,
        border: '2px solid rgba(244,114,182,0.25)',
        boxShadow: '0 8px 32px rgba(196,181,253,0.18), 0 2px 8px rgba(244,114,182,0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, rgba(244,114,182,0.15) 0%, rgba(196,181,253,0.2) 100%)',
          px: 2.5,
          pt: 2.5,
          pb: 1.5,
          borderBottom: '1.5px solid rgba(244,114,182,0.15)',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: '1.4rem' }}>🌸</Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(90deg, #BE185D 0%, #8B5CF6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              My To-Do List
            </Typography>
            <Typography sx={{ fontSize: '1.1rem' }}>✨</Typography>
          </Stack>
          {totalCount > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              {completedCount}/{totalCount} done
            </Typography>
          )}
        </Stack>

        {/* Progress bar */}
        {totalCount > 0 && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'rgba(244,114,182,0.15)',
                '& .MuiLinearProgress-bar': {
                  background: progress === 100
                    ? 'linear-gradient(90deg, #34D399, #60C8F5)'
                    : 'linear-gradient(90deg, #F472B6, #C4B5FD)',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ px: 2.5, py: 2 }}>
        {/* Celebration banner */}
        <Collapse in={!!celebration}>
          <Box
            sx={{
              textAlign: 'center',
              py: 1,
              mb: 1.5,
              borderRadius: 2.5,
              background: 'linear-gradient(90deg, rgba(244,114,182,0.15), rgba(196,181,253,0.2), rgba(244,114,182,0.15))',
              animation: 'pulse-soft 1s ease infinite',
              '@keyframes pulse-soft': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.75 },
              },
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: 'secondary.dark' }}>
              {celebration} All done! 🎊
            </Typography>
          </Box>
        </Collapse>

        {/* Error alert */}
        <Collapse in={!!error}>
          <Alert
            severity="error"
            onClose={clearError}
            sx={{ mb: 1.5, borderRadius: 2.5, fontSize: '0.82rem' }}
          >
            {error}
          </Alert>
        </Collapse>

        {/* Add new todo input */}
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <TextField
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add something fun to do... 🌟"
            size="small"
            fullWidth
            disabled={loading}
            inputProps={{ maxLength: 200 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                fontSize: '0.875rem',
                fontWeight: 600,
                bgcolor: 'white',
              },
            }}
          />
          <Tooltip title="Add">
            <span>
              <IconButton
                onClick={handleAdd}
                disabled={!input.trim() || loading}
                sx={{
                  background: 'linear-gradient(135deg, #F472B6, #C4B5FD)',
                  color: 'white',
                  borderRadius: 2.5,
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  '&:hover': { background: 'linear-gradient(135deg, #BE185D, #8B5CF6)', transform: 'scale(1.08)' },
                  '&:disabled': { background: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.3)' },
                  transition: 'all 0.2s ease',
                }}
              >
                <AddRoundedIcon sx={{ fontSize: '1.2rem' }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {/* Todo items */}
        {loading ? (
          <Box sx={{ py: 2 }}>
            <LinearProgress sx={{ borderRadius: 2, bgcolor: 'rgba(244,114,182,0.1)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #F472B6, #C4B5FD)' } }} />
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.secondary' }}>
              Loading your list...
            </Typography>
          </Box>
        ) : todos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🌸</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', fontWeight: 600 }}>
              No tasks yet — add something above!
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.5, opacity: 0.7 }}>
              Your to-do list is your superpower ✨
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {/* Active todos first, then completed */}
            {[...todos.filter((t) => !t.completed), ...todos.filter((t) => t.completed)].map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onEdit={editTodo}
                onDelete={deleteTodo}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
