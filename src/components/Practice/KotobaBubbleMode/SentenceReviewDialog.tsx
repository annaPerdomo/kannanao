'use client';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { Alert, Box, Button, Chip, IconButton, Stack, TextField, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { PracticeSentence } from '@/types/practiceSentence';

export interface SentenceUpdate {
  id: string;
  sentence_jp?: string;
  sentence_en?: string;
}

interface SentenceReviewDialogProps {
  open: boolean;
  onClose: () => void;
  sentences: PracticeSentence[];
  saving: boolean;
  onSave: (updates: SentenceUpdate[], deletes: string[]) => Promise<void>;
}

export function SentenceReviewDialog({
  open,
  onClose,
  sentences,
  saving,
  onSave,
}: SentenceReviewDialogProps) {
  const t = useTranslations('Practice.sentenceReview');
  const tCommon = useTranslations('Common');
  const theme = useTheme();
  const { brand } = theme.palette;

  const typeLabels: Record<string, string> = {
    question: t('typeQuestion'),
    response: t('typeResponse'),
    statement: t('typeStatement'),
  };

  // Local edits: map of id → edited fields
  const [jpEdits, setJpEdits] = useState<Record<string, string>>({});
  const [enEdits, setEnEdits] = useState<Record<string, string>>({});
  const [deletes, setDeletes] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setJpEdits({});
      setEnEdits({});
      setDeletes(new Set());
      setSaveError(null);
    }
  }, [open]);

  const handleEditJp = useCallback((id: string, value: string) => {
    setJpEdits((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleEditEn = useCallback((id: string, value: string) => {
    setEnEdits((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleToggleDelete = useCallback((id: string) => {
    setDeletes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const hasChanges =
    Object.keys(jpEdits).length > 0 || Object.keys(enEdits).length > 0 || deletes.size > 0;

  const handleSave = useCallback(async () => {
    setSaveError(null);

    // Merge JP and EN edits per sentence
    const editedIds = new Set([...Object.keys(jpEdits), ...Object.keys(enEdits)]);
    const updates: SentenceUpdate[] = [...editedIds]
      .filter((id) => !deletes.has(id))
      .map((id) => {
        const u: SentenceUpdate = { id };
        if (jpEdits[id] !== undefined) u.sentence_jp = jpEdits[id];
        if (enEdits[id] !== undefined) u.sentence_en = enEdits[id];
        return u;
      });

    try {
      await onSave(updates, [...deletes]);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('failedToSave'));
    }
  }, [jpEdits, enEdits, deletes, onSave, onClose, t]);

  // Group sentences by conversation
  const groups = new Map<number, PracticeSentence[]>();
  for (const s of sentences) {
    const arr = groups.get(s.conversationGroup) ?? [];
    arr.push(s);
    groups.set(s.conversationGroup, arr);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0] - b[0]);

  const remaining = sentences.length - deletes.size;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={t('subtitle', { count: sentences.length })}
      icon={<EditNoteIcon />}
      maxWidth="md"
      closeDisabled={saving}
      actions={
        <Stack direction="row" spacing={1.5}>
          <Button
            onClick={onClose}
            disabled={saving}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            {hasChanges ? tCommon('cancel') : tCommon('close')}
          </Button>
          {hasChanges && (
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || remaining < 3}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              {saving ? t('saving') : t('saveChanges', { count: remaining })}
            </Button>
          )}
        </Stack>
      }
      actionsJustify="space-between"
    >
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      {remaining < 3 && deletes.size > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('needMinSentences')}
        </Alert>
      )}

      <Box sx={{ maxHeight: { xs: '60vh', sm: '65vh' }, overflow: 'auto' }}>
        {sortedGroups.map(([groupNum, groupSentences]) => (
          <Box key={groupNum} sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'text.disabled',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                mb: 1,
              }}
            >
              {t('conversationLabel', { num: groupNum })}
            </Typography>

            <Stack spacing={1.5}>
              {groupSentences.map((s) => {
                const isDeleted = deletes.has(s.id);
                const currentJp = jpEdits[s.id] ?? s.sentenceJp;
                const currentEn = enEdits[s.id] ?? s.sentenceEn;

                return (
                  <Box
                    key={s.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: `1px solid ${alpha(isDeleted ? '#EF4444' : brand[200], isDeleted ? 0.4 : 0.5)}`,
                      bgcolor: isDeleted ? alpha('#EF4444', 0.04) : alpha('#fff', 0.4),
                      opacity: isDeleted ? 0.55 : 1,
                      transition: 'opacity 0.2s, border-color 0.2s',
                    }}
                  >
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {/* Type + particle chips */}
                        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
                          <Chip
                            label={typeLabels[s.sentenceType] ?? t('typeStatement')}
                            size="small"
                            sx={{ fontSize: '0.65rem', fontWeight: 700, height: 20, minWidth: 24 }}
                          />
                          <Chip
                            label={s.targetParticle}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              height: 20,
                              color: brand[500],
                              borderColor: brand[300],
                            }}
                          />
                        </Stack>

                        {/* Editable Japanese */}
                        <TextField
                          value={currentJp}
                          onChange={(e) => handleEditJp(s.id, e.target.value)}
                          disabled={isDeleted || saving}
                          size="small"
                          fullWidth
                          slotProps={{
                            input: {
                              sx: {
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                fontFamily: (t: any) => t.fonts.jp, // eslint-disable-line @typescript-eslint/no-explicit-any
                              },
                            },
                          }}
                          sx={{
                            mb: 0.75,
                            '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
                          }}
                        />

                        {/* Editable English */}
                        <TextField
                          value={currentEn}
                          onChange={(e) => handleEditEn(s.id, e.target.value)}
                          disabled={isDeleted || saving}
                          size="small"
                          fullWidth
                          slotProps={{
                            input: {
                              sx: {
                                fontSize: '0.85rem',
                                fontStyle: 'italic',
                              },
                            },
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
                          }}
                        />
                      </Box>

                      {/* Delete toggle */}
                      <IconButton
                        onClick={() => handleToggleDelete(s.id)}
                        disabled={saving}
                        aria-label={isDeleted ? t('undoDelete') : t('deleteSentence')}
                        size="small"
                        sx={{
                          mt: 0.5,
                          color: isDeleted ? '#EF4444' : 'text.disabled',
                          '&:hover': { color: '#EF4444' },
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Box>
    </StyledDialog>
  );
}
