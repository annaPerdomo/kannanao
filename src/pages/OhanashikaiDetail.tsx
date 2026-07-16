'use client';

import type { DragEndEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import EditIcon from '@mui/icons-material/Edit';
import StopIcon from '@mui/icons-material/Stop';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { Label } from '@/components/Deck';
import { stripFurigana } from '@/components/FuriganaText';
import { Loading } from '@/components/Loading';
import {
  BulkImportArea,
  SortableSpeechLineRow,
  SpeechPracticeTiles,
} from '@/components/OhanashikaiDetail';
import { PageHeader } from '@/components/PageHeader';
import { useOhanashikaiLines, useOhanashikais } from '@/hooks/useOhanashikais';
import { useSpeech } from '@/hooks/useSpeech';
import { formatFurigana } from '@/services/api';
import { LAYOUT } from '@/theme';
import type { OhanashikaiPracticeMode } from '@/types/ohanashikai';

interface OhanashikaiDetailProps {
  ohanashikaiId: string;
  onBack: () => void;
  onPractice: (mode: OhanashikaiPracticeMode) => void;
}

export default function OhanashikaiDetail({
  ohanashikaiId,
  onBack,
  onPractice,
}: OhanashikaiDetailProps) {
  const t = useTranslations('Ohanashikai.detail');
  const tc = useTranslations('Common');
  const theme = useTheme();
  const { brand } = theme.palette;

  const { ohanashikais, renameOhanashikai } = useOhanashikais();
  const { lines, loading, addLine, updateLine, deleteLine, importLines, reorderLines } =
    useOhanashikaiLines(ohanashikaiId);
  const { speakAll, stop, speaking } = useSpeech();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = lines.findIndex((l) => l.id === active.id);
      const newIndex = lines.findIndex((l) => l.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      void reorderLines(arrayMove(lines, oldIndex, newIndex));
    },
    [lines, reorderLines],
  );
  const item = ohanashikais.find((o) => o.id === ohanashikaiId);

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const startEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditVal(currentText);
  };

  const commitEdit = useCallback(async () => {
    if (!editingId || !editVal.trim()) {
      setEditingId(null);
      return;
    }
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
      setAutoFormatAllError(err instanceof Error ? err.message : t('genericError'));
    } finally {
      setAutoFormattingAll(false);
    }
  }, [lines, updateLine]);

  const [renamingTitle, setRenamingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState('');

  const startRename = () => {
    setTitleVal(item?.title ?? '');
    setRenamingTitle(true);
  };

  const commitRename = useCallback(async () => {
    const t = titleVal.trim();
    if (!t || !item) {
      setRenamingTitle(false);
      return;
    }
    if (t === item.title) {
      setRenamingTitle(false);
      return;
    }
    await renameOhanashikai(ohanashikaiId, t, item.description);
    setRenamingTitle(false);
  }, [titleVal, item, ohanashikaiId, renameOhanashikai]);

  if (loading) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 6 }}>
        <Loading message={t('loadingSpeech')} />
      </Box>
    );
  }

  return (
    <Box
      sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: { xs: 3, sm: 4 } }}
    >
      {/* Header */}
      {renamingTitle ? (
        <PageHeader onBack={onBack} title="" compact mb={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <TextField
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commitRename();
                if (e.key === 'Escape') setRenamingTitle(false);
              }}
              size="small"
              autoFocus
              sx={{
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '9px',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: brand[800],
                  bgcolor: alpha('#FFFFFF', 0.6),
                },
              }}
            />
            <Tooltip title={tc('save')}>
              <IconButton
                size="small"
                onClick={commitRename}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  bgcolor: alpha('#FFFFFF', 0.6),
                  border: `1.5px solid ${alpha(brand[400], 0.4)}`,
                  color: brand[700],
                  '&:hover': { bgcolor: alpha('#FFFFFF', 0.8) },
                }}
              >
                <CheckIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={tc('cancel')}>
              <IconButton
                size="small"
                onClick={() => setRenamingTitle(false)}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  bgcolor: alpha('#FFFFFF', 0.4),
                  border: `1.5px solid ${alpha(brand[300], 0.3)}`,
                  '&:hover': { bgcolor: alpha('#FFFFFF', 0.7) },
                }}
              >
                <CloseIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </PageHeader>
      ) : (
        <PageHeader
          onBack={onBack}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="h5" sx={{ color: brand[800], lineHeight: 1.1, fontWeight: 800 }}>
                {item?.title ?? t('speechFallbackTitle')}
              </Typography>
              <Tooltip title={t('rename')}>
                <IconButton
                  size="small"
                  onClick={startRename}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '7px',
                    color: alpha(brand[700], 0.4),
                    '&:hover': { bgcolor: alpha('#FFFFFF', 0.5), color: brand[700] },
                  }}
                >
                  <EditIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
            </Box>
          }
          subtitle={item?.description ?? undefined}
          badge={t('lineCount', { count: lines.length })}
          compact
          mb={3}
        />
      )}

      <SpeechPracticeTiles canPractice={lines.length > 0} onPractice={onPractice} />

      {/* Lines section */}
      <Box>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <Label>{t('speechLines')}</Label>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            {lines.length > 0 && !bulkMode && (
              <>
                <Tooltip title={speaking ? t('stop') : t('listenToFullSpeech')}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={
                      speaking ? (
                        <StopIcon sx={{ fontSize: 14 }} />
                      ) : (
                        <VolumeUpIcon sx={{ fontSize: 14 }} />
                      )
                    }
                    onClick={
                      speaking ? stop : () => speakAll(lines.map((l) => stripFurigana(l.text)))
                    }
                    sx={{
                      borderRadius: '9px',
                      px: 1.5,
                      py: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    {speaking ? t('stop') : t('listen')}
                  </Button>
                </Tooltip>
                <Tooltip title={t('autoAddFuriganaHint')}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={
                      autoFormattingAll ? (
                        <CircularProgress size={12} />
                      ) : (
                        <AutoFixHighIcon sx={{ fontSize: 14 }} />
                      )
                    }
                    onClick={handleAutoFormatAll}
                    disabled={autoFormattingAll}
                    sx={{
                      borderRadius: '9px',
                      px: 1.5,
                      py: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    {autoFormattingAll ? t('formatting') : t('autoFuriganaAll')}
                  </Button>
                </Tooltip>
              </>
            )}
            <Button
              variant={bulkMode ? 'contained' : 'outlined'}
              size="small"
              startIcon={
                bulkMode ? (
                  <ViewHeadlineIcon sx={{ fontSize: 14 }} />
                ) : (
                  <ContentPasteIcon sx={{ fontSize: 14 }} />
                )
              }
              onClick={() => setBulkMode((v) => !v)}
              sx={{ borderRadius: '9px', px: 1.5, py: '4px', fontSize: '0.72rem', fontWeight: 700 }}
            >
              {bulkMode ? t('lineByLine') : t('importLines')}
            </Button>
          </Stack>
        </Box>

        {autoFormatAllError && (
          <Alert
            severity="error"
            onClose={() => setAutoFormatAllError(null)}
            sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.75rem' }}
          >
            {t('autoFuriganaFailed', { error: autoFormatAllError })}
          </Alert>
        )}

        {lines.length > 0 && (
          <Box sx={{ position: 'relative', mb: 2 }}>
            {autoFormattingAll && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 10,
                  borderRadius: 2.5,
                  bgcolor: alpha('#FFFFFF', 0.75),
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Loading message={t('addingFuriganaToAll')} />
              </Box>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={lines.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <Stack spacing={1}>
                  {lines.map((line, i) => (
                    <SortableSpeechLineRow
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
              </SortableContext>
            </DndContext>
          </Box>
        )}

        {bulkMode ? (
          <BulkImportArea brandPalette={brand} onImport={importLines} />
        ) : (
          <Box
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: `1.5px dashed ${alpha(brand[300], 0.45)}`,
              bgcolor: alpha(brand[50], 0.5),
            }}
          >
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
                {t('howToTitle')}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: brand[600], lineHeight: 1.6 }}>
                {t.rich('autoHint', {
                  strong: (chunks) => <strong>{chunks}</strong>,
                  em: (chunks) => <em>{chunks}</em>,
                })}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: brand[600], lineHeight: 1.6, mt: 0.25 }}>
                {t.rich('manualHint', {
                  strong: (chunks) => <strong>{chunks}</strong>,
                  kanjiReadingCode: () => (
                    <code
                      style={{
                        background: alpha(brand[200], 0.5),
                        padding: '0 3px',
                        borderRadius: 3,
                      }}
                    >
                      {'{kanji|reading}'}
                    </code>
                  ),
                  exampleCode: () => (
                    <code
                      style={{
                        background: alpha(brand[200], 0.5),
                        padding: '0 3px',
                        borderRadius: 3,
                      }}
                    >
                      {'{私|わたし}'}
                    </code>
                  ),
                })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                inputRef={inputRef}
                value={newLineText}
                onChange={(e) => setNewLineText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing)
                    void handleAddLine();
                }}
                placeholder={t('newLinePlaceholder')}
                size="small"
                fullWidth
                multiline
                minRows={1}
                disabled={adding}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: (t) => t.fonts.jp,
                    fontSize: '0.95rem',
                  },
                }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={
                  adding ? (
                    <CircularProgress size={12} sx={{ color: '#fff' }} />
                  ) : (
                    <AddIcon sx={{ fontSize: 14 }} />
                  )
                }
                onClick={handleAddLine}
                disabled={adding || !newLineText.trim()}
                sx={{ flexShrink: 0, borderRadius: '10px', px: 2 }}
              >
                {t('add')}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
