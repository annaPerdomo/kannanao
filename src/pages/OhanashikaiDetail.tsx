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
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import { Loading } from '@/components/Loading';
import { stripFurigana } from '@/components/FuriganaText';
import { Label } from '@/components/Deck';
import { SpeechPracticeTiles, SpeechLineRow, BulkImportArea } from '@/components/OhanashikaiDetail';
import { formatFurigana } from '@/services/api';
import { useOhanashikais, useOhanashikaiLines } from '@/hooks/useOhanashikais';
import { useSpeech } from '@/hooks/useSpeech';
import type { OhanashikaiPracticeMode } from '@/types/ohanashikai';

interface OhanashikaiDetailProps {
  ohanashikaiId: string;
  onBack: () => void;
  onPractice: (mode: OhanashikaiPracticeMode) => void;
}

export default function OhanashikaiDetail({ ohanashikaiId, onBack, onPractice }: OhanashikaiDetailProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const { ohanashikais, renameOhanashikai } = useOhanashikais();
  const { lines, loading, addLine, updateLine, deleteLine, importLines } = useOhanashikaiLines(ohanashikaiId);
  const { speakAll, stop, speaking } = useSpeech();
  const item = ohanashikais.find((o) => o.id === ohanashikaiId);

  const [newLineText, setNewLineText] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddLine = useCallback(async () => {
    const text = newLineText.trim();
    if (!text) return;
    setAdding(true);
    try { await addLine(text); setNewLineText(''); inputRef.current?.focus(); }
    finally { setAdding(false); }
  }, [newLineText, addLine]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const startEdit = (id: string, currentText: string) => { setEditingId(id); setEditVal(currentText); };

  const commitEdit = useCallback(async () => {
    if (!editingId || !editVal.trim()) { setEditingId(null); return; }
    await updateLine(editingId, editVal.trim());
    setEditingId(null);
  }, [editingId, editVal, updateLine]);

  const [bulkMode, setBulkMode] = useState(false);

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

  const [renamingTitle, setRenamingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState('');

  const startRename = () => { setTitleVal(item?.title ?? ''); setRenamingTitle(true); };

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

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', bgcolor: '#FFFFFF', border: `1.5px solid ${alpha(brand[300], 0.35)}`, boxShadow: `0 2px 12px ${alpha(brand[300], 0.1)}` }}>
        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${brand[200]}, ${accent[300]})`, borderRadius: '3px 0 0 3px' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: { xs: 2.5, sm: 3 }, pl: { xs: 3.5, sm: 4 }, py: { xs: 2, sm: 2.5 }, position: 'relative' }}>
          <IconButton onClick={onBack} size="small" sx={{ border: `1.5px solid ${alpha(brand[300], 0.45)}`, borderRadius: '9px', width: 32, height: 32, flexShrink: 0, color: brand[700], '&:hover': { bgcolor: brand[50], borderColor: brand[400] } }}>
            <ArrowBackIcon sx={{ fontSize: 15 }} />
          </IconButton>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {renamingTitle ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField value={titleVal} onChange={(e) => setTitleVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void commitRename(); if (e.key === 'Escape') setRenamingTitle(false); }} size="small" autoFocus sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: '9px', fontSize: '1.2rem', fontWeight: 700, color: brand[800] } }} />
                <Tooltip title="Save"><IconButton size="small" onClick={commitRename} sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: brand[50] }}><CheckIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                <Tooltip title="Cancel"><IconButton size="small" onClick={() => setRenamingTitle(false)} sx={{ width: 30, height: 30, borderRadius: '8px' }}><CloseIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="h5" sx={{ color: brand[800], lineHeight: 1.1, fontWeight: 800 }}>{item?.title ?? 'Speech'}</Typography>
                <Tooltip title="Rename"><IconButton size="small" onClick={startRename} sx={{ width: 24, height: 24, borderRadius: '7px', color: alpha(brand[700], 0.4), '&:hover': { bgcolor: brand[50], color: brand[700] } }}><EditIcon sx={{ fontSize: 12 }} /></IconButton></Tooltip>
              </Box>
            )}
            {item?.description && !renamingTitle && <Typography variant="body2" sx={{ color: brand[500], mt: 0.25 }}>{item.description}</Typography>}
          </Box>

          {!renamingTitle && (
            <Chip label={`${lines.length} line${lines.length !== 1 ? 's' : ''}`} size="small" sx={{ borderRadius: '8px', bgcolor: brand[50], border: `1.5px solid ${alpha(brand[400], 0.4)}`, color: brand[700], fontWeight: 800, fontSize: '0.7rem', flexShrink: 0 }} />
          )}
        </Box>
      </Box>

      <SpeechPracticeTiles canPractice={lines.length > 0} onPractice={onPractice} />

      {/* Lines section */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Label>Speech Lines</Label>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            {lines.length > 0 && !bulkMode && (
              <>
                <Tooltip title={speaking ? 'Stop' : 'Listen to full speech'}>
                  <Button variant="outlined" size="small" startIcon={speaking ? <StopIcon sx={{ fontSize: 14 }} /> : <VolumeUpIcon sx={{ fontSize: 14 }} />} onClick={speaking ? stop : () => speakAll(lines.map((l) => stripFurigana(l.text)))} sx={{ borderRadius: '9px', px: 1.5, py: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                    {speaking ? 'Stop' : 'Listen'}
                  </Button>
                </Tooltip>
                <Tooltip title="Auto-add kanji + furigana to all saved lines">
                  <Button variant="outlined" size="small" startIcon={autoFormattingAll ? <CircularProgress size={12} /> : <AutoFixHighIcon sx={{ fontSize: 14 }} />} onClick={handleAutoFormatAll} disabled={autoFormattingAll} sx={{ borderRadius: '9px', px: 1.5, py: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                    {autoFormattingAll ? 'Formatting…' : 'Auto Furigana All'}
                  </Button>
                </Tooltip>
              </>
            )}
            <Button variant={bulkMode ? 'contained' : 'outlined'} size="small" startIcon={bulkMode ? <ViewHeadlineIcon sx={{ fontSize: 14 }} /> : <ContentPasteIcon sx={{ fontSize: 14 }} />} onClick={() => setBulkMode((v) => !v)} sx={{ borderRadius: '9px', px: 1.5, py: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
              {bulkMode ? 'Line by Line' : 'Import Lines'}
            </Button>
          </Stack>
        </Box>

        {autoFormatAllError && (
          <Alert severity="error" onClose={() => setAutoFormatAllError(null)} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.75rem' }}>
            Auto Furigana failed: {autoFormatAllError}
          </Alert>
        )}

        {lines.length > 0 && (
          <Box sx={{ position: 'relative', mb: 2 }}>
            {autoFormattingAll && (
              <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: 2.5, bgcolor: alpha('#FFFFFF', 0.75), backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loading message="Adding furigana to all lines…" />
              </Box>
            )}
            <Stack spacing={1}>
              {lines.map((line, i) => (
                <SpeechLineRow
                  key={line.id}
                  lineId={line.id}
                  text={line.text}
                  index={i}
                  editingId={editingId}
                  editVal={editVal}
                  brandPalette={brand}
                  onStartEdit={startEdit}
                  onEditValChange={setEditVal}
                  onCommitEdit={commitEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={deleteLine}
                />
              ))}
            </Stack>
          </Box>
        )}

        {bulkMode ? (
          <BulkImportArea brandPalette={brand} onImport={importLines} />
        ) : (
          <Box sx={{ p: 2, borderRadius: 2.5, border: `1.5px dashed ${alpha(brand[300], 0.45)}`, bgcolor: alpha(brand[50], 0.5) }}>
            <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: alpha(brand[100], 0.5), border: `1px solid ${alpha(brand[300], 0.3)}` }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: brand[700], mb: 0.5 }}>How to add furigana</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: brand[600], lineHeight: 1.6 }}>
                <strong>Auto:</strong> Type plain Japanese, add the line, then use <em>Auto Furigana All</em> ✨ above to format everything at once.
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: brand[600], lineHeight: 1.6, mt: 0.25 }}>
                <strong>Manual:</strong> Use <code style={{ background: alpha(brand[200], 0.5), padding: '0 3px', borderRadius: 3 }}>{'{kanji|reading}'}</code> format, e.g. <code style={{ background: alpha(brand[200], 0.5), padding: '0 3px', borderRadius: 3 }}>{'{私|わたし}'}</code>. Plain hiragana works too!
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                inputRef={inputRef} value={newLineText} onChange={(e) => setNewLineText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) void handleAddLine(); }}
                placeholder="Type a new line and press Enter…" size="small" fullWidth multiline minRows={1} disabled={adding}
                sx={{ '& .MuiOutlinedInput-root': { fontFamily: '"Noto Serif JP", serif', fontSize: '0.95rem' } }}
              />
              <Button variant="contained" size="small" startIcon={adding ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <AddIcon sx={{ fontSize: 14 }} />} onClick={handleAddLine} disabled={adding || !newLineText.trim()} sx={{ flexShrink: 0, borderRadius: '10px', px: 2 }}>
                Add
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
