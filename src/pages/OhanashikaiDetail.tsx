'use client';

import { useState, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { Loading } from '@/components/Loading';
import { useOhanashikais, useOhanashikaiLines } from '@/hooks/useOhanashikais';
import type { OhanashikaiPracticeMode } from '@/types/ohanashikai';

interface OhanashikaiDetailProps {
  ohanashikaiId: string;
  onBack: () => void;
  onPractice: (mode: OhanashikaiPracticeMode) => void;
}

const practiceConfig: {
  mode: OhanashikaiPracticeMode;
  label: string;
  description: string;
  emoji: string;
  watermark: string;
  color: string;
  bg: string;
  border: string;
  shadowColor: string;
}[] = [
  {
    mode: 'readthrough',
    label: 'Read Through',
    description: 'Read every line in order',
    emoji: '📖',
    watermark: '読',
    color: '#7C3AED',
    bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
    border: 'rgba(196,181,253,0.7)',
    shadowColor: 'rgba(124,58,237,0.22)',
  },
  {
    mode: 'linerecall',
    label: 'Line Recall',
    description: 'Type each line from memory',
    emoji: '🎯',
    watermark: '暗',
    color: '#BE185D',
    bg: 'linear-gradient(135deg, #FFF5FB 0%, #FDE8F3 100%)',
    border: 'rgba(249,168,212,0.7)',
    shadowColor: 'rgba(190,24,93,0.22)',
  },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        display: 'block',
        mb: 1.5,
        fontSize: '0.6rem',
        fontWeight: 800,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'primary.main',
        fontFamily: '"Nunito", sans-serif',
      }}
    >
      {children}
    </Typography>
  );
}

export default function OhanashikaiDetail({ ohanashikaiId, onBack, onPractice }: OhanashikaiDetailProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const { ohanashikais, renameOhanashikai } = useOhanashikais();
  const { lines, loading, addLine, updateLine, deleteLine, importLines } = useOhanashikaiLines(ohanashikaiId);

  const item = ohanashikais.find((o) => o.id === ohanashikaiId);

  // ── Add line ──
  const [newLineText, setNewLineText] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddLine = useCallback(async () => {
    const text = newLineText.trim();
    if (!text) return;
    setAdding(true);
    try {
      await addLine(text);
      setNewLineText('');
      inputRef.current?.focus();
    } finally {
      setAdding(false);
    }
  }, [newLineText, addLine]);

  // ── Edit line ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const startEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditVal(currentText);
  };

  const commitEdit = useCallback(async () => {
    if (!editingId || !editVal.trim()) { setEditingId(null); return; }
    await updateLine(editingId, editVal.trim());
    setEditingId(null);
  }, [editingId, editVal, updateLine]);

  // ── Paste import dialog ──
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImport = useCallback(async () => {
    const texts = pasteText.split('\n').map((t) => t.trim()).filter(Boolean);
    if (texts.length === 0) return;
    setImporting(true);
    try {
      await importLines(texts);
      setPasteText('');
      setPasteOpen(false);
    } finally {
      setImporting(false);
    }
  }, [pasteText, importLines]);

  // ── Rename ──
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState('');

  const startRename = () => {
    setTitleVal(item?.title ?? '');
    setRenamingTitle(true);
  };

  const commitRename = useCallback(async () => {
    const t = titleVal.trim();
    if (!t || !item) { setRenamingTitle(false); return; }
    if (t === item.title) { setRenamingTitle(false); return; }
    await renameOhanashikai(ohanashikaiId, t, item.description);
    setRenamingTitle(false);
  }, [titleVal, item, ohanashikaiId, renameOhanashikai]);

  if (loading) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, py: 6 }}>
        <Loading message="Loading speech…" />
      </Box>
    );
  }

  const canPractice = lines.length > 0;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 } }}>

      {/* ── Header ── */}
      <Box
        sx={{
          mb: 3,
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: '#FFFFFF',
          border: `1.5px solid ${alpha(brand[300], 0.35)}`,
          boxShadow: `0 2px 12px ${alpha(brand[300], 0.1)}`,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: `linear-gradient(180deg, ${brand[200]}, ${accent[300]})`,
            borderRadius: '3px 0 0 3px',
          }}
        />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: { xs: 2.5, sm: 3 },
            pl: { xs: 3.5, sm: 4 },
            py: { xs: 2, sm: 2.5 },
            position: 'relative',
          }}
        >
          <IconButton
            onClick={onBack}
            size="small"
            sx={{
              border: `1.5px solid ${alpha(brand[300], 0.45)}`,
              borderRadius: '9px',
              width: 32,
              height: 32,
              flexShrink: 0,
              color: brand[700],
              '&:hover': { bgcolor: brand[50], borderColor: brand[400] },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 15 }} />
          </IconButton>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {renamingTitle ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  value={titleVal}
                  onChange={(e) => setTitleVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitRename();
                    if (e.key === 'Escape') setRenamingTitle(false);
                  }}
                  size="small"
                  autoFocus
                  sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: '9px', fontSize: '1.2rem', fontWeight: 700, color: brand[800] } }}
                />
                <Tooltip title="Save">
                  <IconButton size="small" onClick={commitRename} sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: brand[50] }}>
                    <CheckIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel">
                  <IconButton size="small" onClick={() => setRenamingTitle(false)} sx={{ width: 30, height: 30, borderRadius: '8px' }}>
                    <CloseIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="h5" sx={{ color: brand[800], lineHeight: 1.1, fontWeight: 800 }}>
                  {item?.title ?? 'Speech'}
                </Typography>
                <Tooltip title="Rename">
                  <IconButton size="small" onClick={startRename} sx={{ width: 24, height: 24, borderRadius: '7px', color: alpha(brand[700], 0.4), '&:hover': { bgcolor: brand[50], color: brand[700] } }}>
                    <EditIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
            {item?.description && !renamingTitle && (
              <Typography variant="body2" sx={{ color: brand[500], mt: 0.25 }}>
                {item.description}
              </Typography>
            )}
          </Box>

          {!renamingTitle && (
            <Chip
              label={`${lines.length} line${lines.length !== 1 ? 's' : ''}`}
              size="small"
              sx={{ borderRadius: '8px', bgcolor: brand[50], border: `1.5px solid ${alpha(brand[400], 0.4)}`, color: brand[700], fontWeight: 800, fontSize: '0.7rem', flexShrink: 0 }}
            />
          )}
        </Box>
      </Box>

      {/* ── Practice tiles ── */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(brand[50], 0.9)} 0%, ${alpha(accent[50], 0.8)} 100%)`,
          borderRadius: 3,
          border: `1.5px solid ${alpha(brand[300], 0.35)}`,
          p: { xs: 2.5, sm: 3 },
          mb: 3,
        }}
      >
        <Label>Let&apos;s practice!</Label>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(2, 1fr)' },
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          {practiceConfig.map(({ mode, label, description, emoji, watermark, color, bg, border, shadowColor }) => (
            <Box
              key={mode}
              onClick={canPractice ? () => onPractice(mode) : undefined}
              sx={{
                cursor: canPractice ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '18px',
                p: { xs: '20px 18px', sm: '24px 22px' },
                minHeight: 150,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: bg,
                border: '1.5px solid',
                borderColor: border,
                opacity: canPractice ? 1 : 0.45,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                ...(canPractice && {
                  '&:hover': {
                    transform: 'translateY(-5px) scale(1.02)',
                    boxShadow: `0 12px 32px ${shadowColor}`,
                  },
                }),
              }}
            >
              <Typography
                aria-hidden
                sx={{
                  position: 'absolute',
                  bottom: -16,
                  right: 6,
                  fontSize: '5rem',
                  lineHeight: 1,
                  color,
                  opacity: 0.08,
                  fontFamily: '"Noto Serif JP", serif',
                  fontWeight: 900,
                  userSelect: 'none',
                }}
              >
                {watermark}
              </Typography>
              <Box>
                <Typography sx={{ fontSize: '1.75rem', lineHeight: 1, mb: 1 }}>{emoji}</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: '0.9rem', sm: '0.98rem' }, color, fontFamily: '"Nunito", sans-serif', lineHeight: 1.2 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: `${color}BB`, fontFamily: '"Nunito", sans-serif', mt: 0.4 }}>
                  {description}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: canPractice ? color : 'text.disabled', fontFamily: '"Nunito", sans-serif', letterSpacing: '0.04em', opacity: canPractice ? 0.8 : 0.5, alignSelf: 'flex-end' }}>
                {canPractice ? 'Start →' : 'Add lines first 🔒'}
              </Typography>
            </Box>
          ))}
        </Box>
        {!canPractice && (
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 1.5, textAlign: 'center' }}>
            Add at least 1 line to unlock practice modes.
          </Typography>
        )}
      </Box>

      {/* ── Lines ── */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Label>Speech Lines</Label>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentPasteIcon sx={{ fontSize: 14 }} />}
            onClick={() => setPasteOpen(true)}
            sx={{ borderRadius: '9px', px: 1.5, py: '4px', fontSize: '0.72rem', fontWeight: 700, mb: 1.5 }}
          >
            Paste All
          </Button>
        </Box>

        {/* Existing lines */}
        {lines.length > 0 && (
          <Stack spacing={1} mb={2}>
            {lines.map((line, i) => (
              <Box
                key={line.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2.5,
                  bgcolor: '#FFFFFF',
                  border: `1px solid ${alpha(brand[200], 0.6)}`,
                  boxShadow: `0 1px 6px ${alpha(brand[200], 0.1)}`,
                }}
              >
                {/* Line number badge */}
                <Box
                  sx={{
                    minWidth: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: alpha(brand[100], 0.8),
                    border: `1px solid ${alpha(brand[300], 0.4)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    mt: 0.25,
                  }}
                >
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: brand[600] }}>
                    {i + 1}
                  </Typography>
                </Box>

                {/* Text / edit field */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  {editingId === line.id ? (
                    <TextField
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) void commitEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      size="small"
                      fullWidth
                      multiline
                      autoFocus
                      sx={{ '& .MuiOutlinedInput-root': { fontFamily: '"Noto Serif JP", serif', fontSize: '0.95rem' } }}
                    />
                  ) : (
                    <Typography
                      sx={{
                        fontFamily: '"Noto Serif JP", "Noto Sans JP", serif',
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        lineHeight: 1.7,
                        color: 'text.primary',
                        wordBreak: 'break-all',
                      }}
                    >
                      {line.text}
                    </Typography>
                  )}
                </Box>

                {/* Actions */}
                <Stack direction="row" spacing={0.25} flexShrink={0}>
                  {editingId === line.id ? (
                    <>
                      <Tooltip title="Save (Enter)">
                        <IconButton size="small" onClick={commitEdit} sx={{ width: 26, height: 26, borderRadius: '8px', bgcolor: brand[50], border: `1px solid ${alpha(brand[300], 0.4)}`, color: brand[700] }}>
                          <CheckIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel (Esc)">
                        <IconButton size="small" onClick={() => setEditingId(null)} sx={{ width: 26, height: 26, borderRadius: '8px', color: 'text.secondary', border: '1px solid rgba(0,0,0,0.1)' }}>
                          <CloseIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Edit line">
                        <IconButton size="small" onClick={() => startEdit(line.id, line.text)} sx={{ width: 26, height: 26, borderRadius: '8px', color: alpha(brand[600], 0.5), '&:hover': { bgcolor: brand[50], color: brand[600] } }}>
                          <EditIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete line">
                        <IconButton size="small" onClick={() => deleteLine(line.id)} sx={{ width: 26, height: 26, borderRadius: '8px', color: 'rgba(251,113,133,0.5)', '&:hover': { bgcolor: 'rgba(251,113,133,0.1)', color: 'error.main' } }}>
                          <DeleteIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        {/* Add new line */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 2,
            borderRadius: 2.5,
            border: `1.5px dashed ${alpha(brand[300], 0.45)}`,
            bgcolor: alpha(brand[50], 0.5),
          }}
        >
          <TextField
            inputRef={inputRef}
            value={newLineText}
            onChange={(e) => setNewLineText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) void handleAddLine(); }}
            placeholder="Type a new line and press Enter…"
            size="small"
            fullWidth
            multiline
            minRows={1}
            disabled={adding}
            sx={{ '& .MuiOutlinedInput-root': { fontFamily: '"Noto Serif JP", serif', fontSize: '0.95rem' } }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={adding ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <AddIcon sx={{ fontSize: 14 }} />}
            onClick={handleAddLine}
            disabled={adding || !newLineText.trim()}
            sx={{ flexShrink: 0, borderRadius: '10px', px: 2 }}
          >
            Add
          </Button>
        </Box>
      </Box>

      {/* ── Paste import dialog ── */}
      <Dialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              border: `1.5px solid ${alpha(brand[300], 0.35)}`,
              minWidth: { xs: 320, sm: 480 },
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: brand[700], display: 'flex', alignItems: 'center', gap: 1 }}>
          <ContentPasteIcon sx={{ fontSize: '1.2rem' }} /> Paste All Lines
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paste your entire speech below — each line on its own line. They&apos;ll be added in order.
          </Typography>
          <TextField
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={'Line 1 of your speech\nLine 2 of your speech\nLine 3 of your speech\n…'}
            fullWidth
            multiline
            minRows={6}
            maxRows={16}
            autoFocus
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {pasteText.split('\n').filter((l) => l.trim()).length} lines detected
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setPasteOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={importing || !pasteText.trim()}
          >
            {importing ? 'Importing…' : 'Add Lines ✨'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
