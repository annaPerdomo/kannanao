'use client';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { Group } from '@/hooks/useGroups';
import { JLPT_LEVELS, STYLE_NOTES_MAX } from '@/lib/lessonPrompts';

import {
  CARDS_PER_DECK_CHOICES,
  GOAL_MAX_LENGTH,
  GOAL_SUGGESTION_KEYS,
  type LessonSetForm,
  WEEK_CHOICES,
} from './constants';
import { DocumentUpload } from './DocumentUpload';
import { StepSection } from './StepSection';

interface AskStepProps {
  groups: Group[];
  groupId: string;
  form: LessonSetForm;
  onGroupChange: (groupId: string) => void;
  onChange: (patch: Partial<LessonSetForm>) => void;
  onSubmit: () => void;
}

function MaterialCard(props: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onToggle?: (checked: boolean) => void;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const { label, hint, checked, disabled, onToggle } = props;

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.5,
        p: 1.5,
        borderRadius: theme.radii.md,
        border: `1.5px solid ${checked ? brand[400] : alpha(brand[300], 0.4)}`,
        bgcolor: checked ? alpha(brand[100], 0.4) : 'background.paper',
        flex: '1 1 220px',
        opacity: disabled ? 0.75 : 1,
      }}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle?.(e.target.checked)}
        slotProps={{ input: { 'aria-label': label } }}
        sx={{ p: 0.5, mt: -0.25 }}
      />
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{hint}</Typography>
      </Box>
    </Paper>
  );
}

export function AskStep({
  groups,
  groupId,
  form,
  onGroupChange,
  onChange,
  onSubmit,
}: AskStepProps) {
  const t = useTranslations('Group.lessonBuilder');
  const tm = useTranslations('Materials');
  const [advancedOpen, setAdvancedOpen] = useState(form.styleNotes.length > 0);

  const ready = form.goal.trim().length > 0;

  return (
    <Stack spacing={4}>
      <StepSection number={1} title={tm('step1Title')} subtitle={tm('step1Subtitle')}>
        <Stack spacing={1.5}>
          <TextField
            label={t('goalLabel')}
            placeholder={t('goalPlaceholder')}
            value={form.goal}
            onChange={(e) => onChange({ goal: e.target.value.slice(0, GOAL_MAX_LENGTH) })}
            multiline
            minRows={3}
            fullWidth
            helperText={`${form.goal.length} / ${GOAL_MAX_LENGTH}`}
            slotProps={{ formHelperText: { sx: { textAlign: 'right', mr: 0 } } }}
          />
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ alignItems: 'center' }}>
            <AutoAwesomeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            {GOAL_SUGGESTION_KEYS.map((key) => (
              <Chip
                key={key}
                label={tm(`suggestions.${key}Label`)}
                onClick={() => onChange({ goal: tm(`suggestions.${key}Goal`) })}
                variant="outlined"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Stack>
          <DocumentUpload
            documents={form.documents}
            onChange={(documents) => onChange({ documents })}
          />
        </Stack>
      </StepSection>

      <StepSection number={2} title={tm('step2Title')} subtitle={tm('step2Subtitle')}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          }}
        >
          {groups.length > 1 && (
            <TextField
              select
              label={tm('groupLabel')}
              value={groupId}
              onChange={(e) => onGroupChange(e.target.value)}
            >
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.emoji ? `${g.emoji} ${g.name}` : g.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            select
            label={tm('levelLabel')}
            value={form.level}
            onChange={(e) => onChange({ level: e.target.value as LessonSetForm['level'] })}
          >
            {JLPT_LEVELS.map((level) => (
              <MenuItem key={level} value={level}>
                {tm(`levels.${level}`)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label={t('weeksLabel')}
            value={form.weeks}
            onChange={(e) => onChange({ weeks: Number(e.target.value) })}
          >
            {WEEK_CHOICES.map((w) => (
              <MenuItem key={w} value={w}>
                {t('weeksOption', { count: w })}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label={t('cardsPerDeckLabel')}
            value={form.cardsPerDeck}
            onChange={(e) => onChange({ cardsPerDeck: Number(e.target.value) })}
          >
            {CARDS_PER_DECK_CHOICES.map((c) => (
              <MenuItem key={c} value={c}>
                {t('cardsOption', { count: c })}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ mt: 1.5 }}>
          <Button
            onClick={() => setAdvancedOpen((open) => !open)}
            endIcon={advancedOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, px: 0.5 }}
          >
            {tm('advancedToggle')}
          </Button>
          <Collapse in={advancedOpen}>
            <TextField
              label={tm('styleNotesLabel')}
              placeholder={tm('styleNotesPlaceholder')}
              value={form.styleNotes}
              onChange={(e) => onChange({ styleNotes: e.target.value.slice(0, STYLE_NOTES_MAX) })}
              multiline
              minRows={2}
              fullWidth
              helperText={tm('styleNotesHint')}
              sx={{ mt: 1 }}
            />
          </Collapse>
        </Box>
      </StepSection>

      <StepSection number={3} title={tm('step3Title')} subtitle={tm('step3Subtitle')}>
        <Stack direction="row" flexWrap="wrap" gap={1.5}>
          <MaterialCard
            label={tm('vocabularyDecksLabel')}
            hint={tm('vocabularyDecksHint')}
            checked
            disabled
          />
          <MaterialCard
            label={t('sentencesToggleLabel')}
            hint={t('sentencesToggleHint')}
            checked={form.withSentences}
            onToggle={(withSentences) => onChange({ withSentences })}
          />
        </Stack>
      </StepSection>

      <Box>
        <Button
          variant="contained"
          size="large"
          disabled={!ready}
          onClick={onSubmit}
          startIcon={<AutoAwesomeIcon />}
        >
          {t('buildButton')}
        </Button>
      </Box>
    </Stack>
  );
}
