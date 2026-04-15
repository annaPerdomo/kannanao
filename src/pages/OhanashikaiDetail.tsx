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
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import { Loading } from '@/components/Loading';
import FuriganaText, { stripFurigana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import { formatFurigana } from '@/services/api';
import { useOhanashikais, useOhanashikaiLines } from '@/hooks/useOhanashikais';
import { useSpeech } from '@/hooks/useSpeech';
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
  const { speakAll, stop, speaking } = useSpeech();

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

  // ── Bulk import ──
  const [bulkMode, setBulkMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const [addingFurigana, setAddingFurigana] = useState(false);
  const [furiganaError, setFuriganaError] = useState<string | null>(null);

  const handleAddFurigana = useCallback(async () => {
    const rawLines = pasteText.split('\n').map((t) => t.trim()).filter(Boolean);
    if (rawLines.length === 0) return;
    setAddingFurigana(true);
    setFuriganaError(null);
    try {
      const formatted = await formatFurigana(rawLines);
      setPasteText(formatted.join('\n'));
    } catch (err) {
      setFuriganaError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setAddingFurigana(false);
    }
  }, [pasteText]);

  // ── Auto-format all saved lines ──
  const [autoFormattingAll, setAutoFormattingAll] = useState(false);
  const [autoFormatAllError, setAutoFormatAllError] = useState<string | null>(null);

  const handleAutoFormatAll = useCallback(async () => {
    if (lines.length === 0) return;
    setAutoFormattingAll(true);
    setAutoFormatAllError(null);
    try {
      const formatted = await formatFurigana(lines.map((l) => l.text));
      await Promise.all(lines.map((line, i) => updateLine(line.id, formatted[i])));
    } catch (err) {
      setAutoFormatAllError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setAutoFormattingAll(false);
    }
  }, [lines, updateLine]);

  const handleImport = useCallback(async () => {
    const texts = pasteText.split('\n').map((t) => t.trim()).filter(Boolean);
    if (texts.length === 0) return;
    setImporting(true);
    try {
      await importLines(texts);
      setPasteText('');
      setBulkMode(false);
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
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            {lines.length > 0 && !bulkMode && (
              <>
                <Tooltip title={speaking ? 'Stop' : 'Listen to full speech'}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={speaking ? <StopIcon sx={{ fontSize: 14 }} /> : <VolumeUpIcon sx={{ fontSize: 14 }} />}
                    onClick={speaking ? stop : () => speakAll(lines.map((l) => stripFurigana(l.text)))}
                    sx={{ borderRadius: '9px', px: 1.5, py: '4px', fontSize: '0.72rem', fontWeight: 700 }}
                  >
                    {speaking ? 'Stop' : 'Listen'}
                  </Button>
                </Tooltip>
                <Tooltip title="Auto-add kanji + furigana to all saved lines">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={autoFormattingAll ? <CircularProgress size={12} /> : <AutoFixHighIcon sx={{ fontSize: 14 }} />}
                    onClick={handleAutoFormatAll}
                    disabled={autoFormattingAll}
                    sx={{ borderRadius: '9px', px: 1.5, py: '4px', fontSize: '0.72rem', fontWeight: 700 }}
                  >
                    {autoFormattingAll ? 'Formatting…' : 'Auto Furigana All'}
                  </Button>
                </Tooltip>
              </>
            )}
            <Button
              variant={bulkMode ? 'contained' : 'outlined'}
              size="small"
              startIcon={bulkMode ? <ViewHeadlineIcon sx={{ fontSize: 14 }} /> : <ContentPasteIcon sx={{ fontSize: 14 }} />}
              onClick={() => { setBulkMode((v) => !v); setPasteText(''); }}
              sx={{ borderRadius: '9px', px: 1.5, py: '4px', fontSize: '0.72rem', fontWeight: 700 }}
            >
              {bulkMode ? 'Line by Line' : 'Import Lines'}
            </Button>
          </Stack>
        </Box>

        {/* Auto-format-all error */}
        {autoFormatAllError && (
          <Alert severity="error" onClose={() => setAutoFormatAllError(null)} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.75rem' }}>
            Auto Furigana failed: {autoFormatAllError}
          </Alert>
        )}

        {/* Existing lines */}
        {lines.length > 0 && (
          <Box sx={{ position: 'relative', mb: 2 }}>
            {autoFormattingAll && (
              <Box sx={{
                position: 'absolute', inset: 0, zIndex: 10, borderRadius: 2.5,
                bgcolor: alpha('#FFFFFF', 0.75), backdropFilter: 'blur(2px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loading message="Adding furigana to all lines…" />
              </Box>
            )}
          <Stack spacing={1}>
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
                    <FuriganaText
                      text={line.text}
                      showFurigana
                      sx={{
                        fontFamily: '"Noto Serif JP", "Noto Sans JP", serif',
                        fontSize: { xs: '1.1rem', sm: '1.25rem' },
                        lineHeight: 2.8,
                        color: 'text.primary',
                        wordBreak: 'break-all',
                      }}
                    />
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
                      <Tooltip title="Listen">
                        <span>
                          <SpeakButton text={stripFurigana(line.text)} iconSize="13px" sx={{ width: 26, height: 26, borderRadius: '8px' }} />
                        </span>
                      </Tooltip>
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
          </Box>
        )}

        {/* Add area — toggles between line-by-line and bulk import */}
        {bulkMode ? (
          <Box
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: `1.5px dashed ${alpha(brand[300], 0.45)}`,
              bgcolor: alpha(brand[50], 0.5),
            }}
          >
            {/* Instructions */}
            <Box
              sx={{
                mb: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(brand[100], 0.5),
                border: `1px solid ${alpha(brand[300], 0.3)}`,
              }}
            >
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: brand[700], mb: 0.5 }}>
                How to add furigana
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: brand[600], lineHeight: 1.6 }}>
                <strong>Option 1 — Auto:</strong> Paste plain Japanese, then hit <em>Auto Furigana</em> ✨ and it'll add kanji + readings for you.
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: brand[600], lineHeight: 1.6, mt: 0.25 }}>
                <strong>Option 2 — Manual:</strong> Use <code style={{ background: alpha(brand[200], 0.5), padding: '0 3px', borderRadius: 3 }}>{'{kanji|reading}'}</code> format, e.g. <code style={{ background: alpha(brand[200], 0.5), padding: '0 3px', borderRadius: 3 }}>{'{私|わたし}'}</code>. Plain hiragana lines work too!
              </Typography>
            </Box>

            {/* Textarea + transparent loading overlay */}
            <Box sx={{ position: 'relative' }}>
              {addingFurigana && (
                <Box sx={{
                  position: 'absolute', inset: 0, zIndex: 10, borderRadius: 2,
                  bgcolor: alpha('#FFFFFF', 0.75), backdropFilter: 'blur(2px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Loading message="Adding furigana…" />
                </Box>
              )}
              <TextField
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setFuriganaError(null); }}
                placeholder={'Line 1 of your speech\nLine 2 of your speech\n…'}
                fullWidth
                multiline
                minRows={6}
                maxRows={16}
                autoFocus
                sx={{ mb: 1, '& .MuiOutlinedInput-root': { fontFamily: '"Noto Serif JP", serif', fontSize: '0.95rem' } }}
              />
            </Box>

            {/* Error */}
            {furiganaError && (
              <Alert severity="error" onClose={() => setFuriganaError(null)} sx={{ mb: 1, borderRadius: 2, fontSize: '0.75rem' }}>
                Auto Furigana failed: {furiganaError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {pasteText.split('\n').filter((l) => l.trim()).length} lines detected
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={addingFurigana ? <CircularProgress size={12} /> : <AutoFixHighIcon sx={{ fontSize: 14 }} />}
                  onClick={handleAddFurigana}
                  disabled={addingFurigana || importing || !pasteText.trim()}
                  sx={{ borderRadius: '10px', px: 2, fontSize: '0.72rem', fontWeight: 700 }}
                >
                  {addingFurigana ? 'Adding furigana…' : 'Auto Furigana'}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={importing ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <AddIcon sx={{ fontSize: 14 }} />}
                  onClick={handleImport}
                  disabled={importing || addingFurigana || !pasteText.trim()}
                  sx={{ borderRadius: '10px', px: 2 }}
                >
                  {importing ? 'Importing…' : 'Add Lines'}
                </Button>
              </Stack>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: `1.5px dashed ${alpha(brand[300], 0.45)}`,
              bgcolor: alpha(brand[50], 0.5),
            }}
          >
            {/* Instructions */}
            <Box
              sx={{
                mb: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(brand[100], 0.5),
                border: `1px solid ${alpha(brand[300], 0.3)}`,
              }}
            >
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: brand[700], mb: 0.5 }}>
                How to add furigana
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: brand[600], lineHeight: 1.6 }}>
                <strong>Auto:</strong> Type plain Japanese, add the line, then use <em>Auto Furigana All</em> ✨ above to format everything at once.
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: brand[600], lineHeight: 1.6, mt: 0.25 }}>
                <strong>Manual:</strong> Use <code style={{ background: alpha(brand[200], 0.5), padding: '0 3px', borderRadius: 3 }}>{'{kanji|reading}'}</code> format, e.g. <code style={{ background: alpha(brand[200], 0.5), padding: '0 3px', borderRadius: 3 }}>{'{私|わたし}'}</code>. Plain hiragana works too!
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                inputRef={inputRef}
                value={newLineText}
                onChange={(e) => setNewLineText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) void handleAddLine(); }}
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
        )}
      </Box>
    </Box>
  );
}
