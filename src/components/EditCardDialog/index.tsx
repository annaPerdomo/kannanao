'use client';

import SaveIcon from '@mui/icons-material/Save';
import { Box, Button, CircularProgress, Divider, TextField } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { Flashcard, JlptLevel, MainViewMode } from '@/types/flashcard';

import { CardSettingsPanel } from './CardSettingsPanel';
import {
  type EditableFields,
  FIELD_CONFIG,
  sharedTextFieldSx as sharedTextFieldSxFn,
} from './constants';
import { ImageSection } from './ImageSection';

interface EditCardDialogProps {
  card: Flashcard | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Flashcard) => void;
}

export function EditCardDialog({ card, open, onClose, onSave }: EditCardDialogProps) {
  const t = useTranslations('Deck.editCardDialog');
  const tFields = useTranslations('Deck.editCardDialog.fields');
  const tCommon = useTranslations('Common');
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const sharedTextFieldSx = sharedTextFieldSxFn(theme);

  const [fields, setFields] = useState<EditableFields>({
    word: '',
    reading: '',
    meaning: '',
    example_jp: '',
    example_en: '',
    imageUrl: undefined,
    image_query: '',
  });
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('hiragana');
  const [cardType, setCardType] = useState<'word' | 'phrase'>('word');
  const [jlptLevel, setJlptLevel] = useState<JlptLevel | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setFields({
        word: card.word,
        reading: card.reading,
        meaning: card.meaning,
        example_jp: card.example_jp,
        example_en: card.example_en,
        imageUrl: card.imageUrl,
        image_query: card.image_query ?? '',
      });
      setMainViewMode(card.mainViewMode ?? 'hiragana');
      setCardType(card.cardType ?? 'word');
      setJlptLevel(card.jlptLevel);
    }
  }, [card]);

  const handleFieldChange =
    (key: keyof EditableFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={card?.word ? `${card.word}${card.reading ? ` · ${card.reading}` : ''}` : undefined}
      maxWidth="sm"
      actions={
        <>
          <Button
            onClick={onClose}
            disabled={saving}
            sx={{
              borderRadius: '10px',
              color: brand[700],
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.8rem',
            }}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !fields.word.trim()}
            startIcon={
              saving ? (
                <CircularProgress size={13} sx={{ color: 'white' }} />
              ) : (
                <SaveIcon sx={{ fontSize: 15 }} />
              )
            }
            sx={{
              borderRadius: '10px',
              px: 2.5,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.8rem',
              background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
              '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
            }}
          >
            {saving ? t('saving') : t('saveChanges')}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <CardSettingsPanel
          mainViewMode={mainViewMode}
          onMainViewModeChange={setMainViewMode}
          cardType={cardType}
          onCardTypeChange={setCardType}
          jlptLevel={jlptLevel}
          onJlptLevelChange={setJlptLevel}
          word={fields.word}
          reading={fields.reading}
        />

        {FIELD_CONFIG.map(({ key, labelKey, placeholderKey, multiline, rows, helperTextKey }) => (
          <TextField
            key={key}
            label={tFields(labelKey)}
            value={fields[key] ?? ''}
            onChange={handleFieldChange(key)}
            placeholder={tFields(placeholderKey)}
            multiline={multiline}
            rows={rows}
            helperText={helperTextKey ? tFields(helperTextKey) : undefined}
            fullWidth
            size="small"
            sx={{
              ...sharedTextFieldSx,
              ...((key === 'reading' && mainViewMode === 'hiragana') ||
              (key === 'word' && mainViewMode === 'kanji')
                ? {
                    '& .MuiOutlinedInput-root fieldset': {
                      borderColor: alpha(brand[400], 0.5),
                      borderWidth: '1.5px',
                    },
                  }
                : {}),
            }}
          />
        ))}

        <Divider sx={{ borderColor: alpha(brand[300], 0.25), my: 0.5 }} />

        <ImageSection
          imageUrl={fields.imageUrl}
          word={fields.word}
          initialQuery={card?.image_query || ''}
          onImageChange={(url) => setFields((prev) => ({ ...prev, imageUrl: url }))}
          onQueryChange={(q) => setFields((prev) => ({ ...prev, image_query: q }))}
        />
      </Box>
    </StyledDialog>
  );
}
