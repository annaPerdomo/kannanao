'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { AssignmentGoalPicker } from '@/components/Group/AssignmentGoalPicker';
import { KanaSetPicker } from '@/components/Group/KanaSetPicker';
import type { Group } from '@/hooks/useGroups';
import type { KanaCourseScript } from '@/lib/kanaCourse';
import { setCharacters } from '@/lib/kanaCurriculum';

import {
  KANA_COURSE_WEEK_CHOICES,
  KANA_SCRIPT_CHOICES,
  type KanaCourseForm,
  ROWS_PER_WEEK_CHOICES,
} from './kanaCourseConstants';
import { StepSection } from './StepSection';

interface KanaCourseAskProps {
  groups: Group[];
  groupId: string;
  form: KanaCourseForm;
  /** Rows the group's own lessons need, null while unknown. */
  deckCount: number | null;
  loadingSource: boolean;
  /** The row the group has already read up to, if coverage says so. */
  suggestedSetId: string | null;
  onGroupChange: (groupId: string) => void;
  onChange: (patch: Partial<KanaCourseForm>) => void;
  onSubmit: () => void;
}

function SourceCard(props: {
  label: string;
  hint: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const { label, hint, selected, disabled, onSelect } = props;

  return (
    <Paper
      elevation={0}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      onClick={() => !disabled && onSelect()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      sx={{
        p: 1.5,
        borderRadius: theme.radii.md,
        border: `1.5px solid ${selected ? brand[400] : alpha(brand[300], 0.4)}`,
        bgcolor: selected ? alpha(brand[100], 0.4) : 'background.paper',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        flex: '1 1 220px',
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{hint}</Typography>
    </Paper>
  );
}

export function KanaCourseAsk({
  groups,
  groupId,
  form,
  deckCount,
  loadingSource,
  suggestedSetId,
  onGroupChange,
  onChange,
  onSubmit,
}: KanaCourseAskProps) {
  const t = useTranslations('Materials.kanaCourse');
  const fromLessons = form.sourceKind === 'lessons';
  const dateOk = fromLessons || /^\d{4}-\d{2}-\d{2}$/.test(form.firstDueDate);

  return (
    <Stack spacing={3}>
      <StepSection number={1} title={t('step1Title')} subtitle={t('step1Subtitle')}>
        <Stack spacing={1.5}>
          {groups.length > 1 && (
            <TextField
              select
              label={t('groupLabel')}
              value={groupId}
              onChange={(e) => onGroupChange(e.target.value)}
              sx={{ maxWidth: 320 }}
            >
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.emoji ? `${g.emoji} ${g.name}` : g.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            <SourceCard
              label={t('sourceLessons')}
              hint={
                loadingSource
                  ? t('sourceLessonsLoading')
                  : deckCount
                    ? t('sourceLessonsHint', { count: deckCount })
                    : t('sourceLessonsEmpty')
              }
              selected={fromLessons}
              disabled={!loadingSource && !deckCount}
              onSelect={() => onChange({ sourceKind: 'lessons' })}
            />
            <SourceCard
              label={t('sourceChart')}
              hint={t('sourceChartHint')}
              selected={!fromLessons}
              onSelect={() => onChange({ sourceKind: 'chart' })}
            />
          </Stack>
        </Stack>
      </StepSection>

      <StepSection number={2} title={t('step2Title')} subtitle={t('step2Subtitle')}>
        <Stack spacing={2}>
          {!fromLessons && (
            <>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={form.script}
                onChange={(_, next: KanaCourseScript | null) =>
                  next && onChange({ script: next, fromSetId: null })
                }
                sx={{ flexWrap: 'wrap' }}
              >
                {KANA_SCRIPT_CHOICES.map((script) => (
                  <ToggleButton key={script} value={script} sx={{ textTransform: 'none', px: 2 }}>
                    {t(`script.${script}`)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.5 }}>
                  {t('startRowLabel')}
                </Typography>
                {suggestedSetId && (
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1 }}>
                    {t('startRowSuggestion', { kana: setCharacters(suggestedSetId) ?? '' })}
                  </Typography>
                )}
                <KanaSetPicker
                  value={form.fromSetId ?? suggestedSetId}
                  onChange={(setId) => onChange({ fromSetId: setId })}
                  script={form.script}
                />
              </Box>
            </>
          )}

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            }}
          >
            {!fromLessons && (
              <TextField
                select
                label={t('weeksLabel')}
                value={form.weeks}
                onChange={(e) => onChange({ weeks: Number(e.target.value) })}
              >
                {KANA_COURSE_WEEK_CHOICES.map((n) => (
                  <MenuItem key={n} value={n}>
                    {t('weeksValue', { count: n })}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              select
              label={t('rowsPerWeekLabel')}
              value={form.rowsPerWeek}
              onChange={(e) => onChange({ rowsPerWeek: Number(e.target.value) })}
            >
              {ROWS_PER_WEEK_CHOICES.map((n) => (
                <MenuItem key={n} value={n}>
                  {t('rowsPerWeekValue', { count: n })}
                </MenuItem>
              ))}
            </TextField>

            {!fromLessons && (
              <TextField
                type="date"
                label={t('firstDueDateLabel')}
                value={form.firstDueDate}
                onChange={(e) => onChange({ firstDueDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                error={!dateOk}
                helperText={dateOk ? undefined : t('firstDueDateMissing')}
              />
            )}
          </Box>

          {fromLessons && (
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              {t('lessonsDatesHint')}
            </Typography>
          )}

          <AssignmentGoalPicker
            accuracy={form.accuracy}
            mode={null}
            hideModes
            onAccuracyChange={(accuracy) => onChange({ accuracy })}
            onModeChange={() => {}}
          />

          <Box>
            <Button
              variant="contained"
              size="large"
              onClick={onSubmit}
              disabled={loadingSource || !dateOk}
            >
              {t('buildButton')}
            </Button>
          </Box>
        </Stack>
      </StepSection>
    </Stack>
  );
}
