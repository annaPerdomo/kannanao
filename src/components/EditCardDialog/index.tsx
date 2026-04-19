'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogActions,
  Box, TextField, Button, Typography, IconButton,
  CircularProgress, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import type { Flashcard, JlptLevel } from '@/types/flashcard';
import { CardSettingsPanel } from './CardSettingsPanel';
import { ImageSection } from './ImageSection';
import { FIELD_CONFIG, sharedTextFieldSx, type EditableFields } from './constants';

interface EditCardDialogProps {
  card: Flashcard | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Flashcard) => void;
}

export function EditCardDialog({ card, open, onClose, onSave }: EditCardDialogProps) {
  const [fields, setFields] = useState<EditableFields>({
    word: '', reading: '', meaning: '', example_jp: '', example_en: '', imageUrl: undefined,
  });
  const [mainViewMode, setMainViewMode] = useState<'hiragana' | 'kanji'>('hiragana');
  const [cardType, setCardType] = useState<'word' | 'phrase'>('word');
  const [jlptLevel, setJlptLevel] = useState<JlptLevel | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setFields({ word: card.word, reading: card.reading, meaning: card.meaning, example_jp: card.example_jp, example_en: card.example_en, imageUrl: card.imageUrl });
      setMainViewMode(card.mainViewMode ?? 'hiragana');
      setCardType(card.cardType ?? 'word');
      setJlptLevel(card.jlptLevel);
    }
  }, [card]);

  const handleFieldChange = (key: keyof EditableFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      onSave({ ...card, ...fields, mainViewMode, cardType, jlptLevel });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: '18px', border: '1.5px solid rgba(249,168,212,0.35)', boxShadow: '0 8px 40px rgba(249,168,212,0.2)', bgcolor: '#FFFBFE', overflow: 'hidden' } } }}
    >
      <DialogTitle sx={{ p: '16px 20px 14px', background: 'linear-gradient(135deg, #FFF0F8 0%, #FAF5FF 100%)', borderBottom: '1.5px solid rgba(249,168,212,0.2)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#9D174D', lineHeight: 1.2 }}>
            Edit Card
          </Typography>
          {card?.word && (
            <Typography sx={{ fontSize: '0.72rem', color: '#C2709A', mt: 0.25 }}>
              {card.word} {card.reading ? `· ${card.reading}` : ''}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ border: '1.5px solid rgba(249,168,212,0.4)', borderRadius: '8px', width: 28, height: 28, color: '#BE185D', '&:hover': { bgcolor: '#FFF0F8' } }}>
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: '16px !important', px: '20px', pb: '20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <CardSettingsPanel
          mainViewMode={mainViewMode} onMainViewModeChange={setMainViewMode}
          cardType={cardType} onCardTypeChange={setCardType}
          jlptLevel={jlptLevel} onJlptLevelChange={setJlptLevel}
          word={fields.word} reading={fields.reading}
        />

        {FIELD_CONFIG.map(({ key, label, placeholder, multiline, rows, helperText }) => (
          <TextField
            key={key} label={label} value={fields[key] ?? ''} onChange={handleFieldChange(key)}
            placeholder={placeholder} multiline={multiline} rows={rows}
            helperText={helperText} fullWidth size="small"
            sx={{
              ...sharedTextFieldSx,
              ...((key === 'reading' && mainViewMode === 'hiragana') || (key === 'word' && mainViewMode === 'kanji')
                ? { '& .MuiOutlinedInput-root fieldset': { borderColor: 'rgba(236,72,153,0.5)', borderWidth: '1.5px' } }
                : {}),
            }}
          />
        ))}

        <Divider sx={{ borderColor: 'rgba(249,168,212,0.25)', my: 0.5 }} />

        <ImageSection
          imageUrl={fields.imageUrl}
          word={fields.word}
          initialQuery={card?.image_query || card?.word || ''}
          onImageChange={(url) => setFields((prev) => ({ ...prev, imageUrl: url }))}
        />
      </DialogContent>

      <DialogActions sx={{ px: '20px', pb: '16px', pt: 0, gap: 1 }}>
        <Button onClick={onClose} disabled={saving} sx={{ borderRadius: '9px', color: '#BE185D', fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}>
          Cancel
        </Button>
        <Button
          variant="contained" onClick={handleSave} disabled={saving || !fields.word.trim()}
          startIcon={saving ? <CircularProgress size={13} sx={{ color: 'white' }} /> : <SaveIcon sx={{ fontSize: 15 }} />}
          sx={{ borderRadius: '9px', px: 2.5, fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
