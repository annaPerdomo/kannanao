'use client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { type KeyboardEvent, useState } from 'react';

import { formatDate } from '@/components/Group/dueDate';
import { useGoalLabel } from '@/components/Group/useGoalLabel';
import { openBlankPrintWindow, writePrintWindow } from '@/lib/lessonPrintable';
import { currentWeekSummary } from '@/lib/lessonUnits';
import { loadCards } from '@/lib/supabase';
import { buildUnitPlanHtml } from '@/lib/unitPlanPrintable';
import type { LessonUnit, LessonUnitWeek } from '@/types/lessonUnit';

import { WeekRow } from './WeekRow';

const CAN_DO_MAX = 8;

interface UnitCardProps {
  unit: LessonUnit;
  groupName: string;
  onOpenWeek: (week: LessonUnitWeek) => void;
  onEditWeek: (week: LessonUnitWeek) => void;
  onShiftWeek: (week: LessonUnitWeek) => void;
  onRenameUnit: (title: string | null) => void;
  onAddWeek: () => void;
  onCopyUnit: () => void;
  defaultExpanded?: boolean;
}

export function UnitCard({
  unit,
  groupName,
  onOpenWeek,
  onEditWeek,
  onShiftWeek,
  onRenameUnit,
  onAddWeek,
  onCopyUnit,
  defaultExpanded = false,
}: UnitCardProps) {
  const t = useTranslations('Materials.library');
  const tBuilder = useTranslations('Group.lessonBuilder');
  const locale = useLocale();
  const goalLabel = useGoalLabel();
  const theme = useTheme();
  const { brand } = theme.palette;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [printPopupBlocked, setPrintPopupBlocked] = useState(false);

  const { current, total, lastFinished } = currentWeekSummary(unit);
  const summary = [
    current != null
      ? t('weekOfTotal', { current, total })
      : total > 0
        ? t('allWeeksDone', { total })
        : null,
    lastFinished ? t('lastWeekFinished', lastFinished) : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  const title = unit.title ?? t('untitledUnit', { date: formatDate(unit.createdAt, locale) });
  const canDoNotes = unit.weeks.map((w) => w.note).filter((note): note is string => Boolean(note));

  const startRename = () => {
    setDraftTitle(unit.title ?? '');
    setRenaming(true);
  };

  const commitRename = () => {
    setRenaming(false);
    const next = draftTitle.trim();
    onRenameUnit(next || null);
  };

  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setRenaming(false);
    }
  };

  const handlePrintUnit = async () => {
    const win = openBlankPrintWindow();
    if (!win) {
      setPrintPopupBlocked(true);
      return;
    }
    setPrintPopupBlocked(false);
    writePrintWindow(win, `<p>${t('printLoading')}</p>`);

    let loadFailed = false;
    const entries = await Promise.all(
      unit.weeks.map(async (week) => {
        try {
          const words = await loadCards(week.deckId);
          return [
            week.deckId,
            words.map((c) => ({ word: c.word, reading: c.reading, meaning: c.meaning })),
          ] as const;
        } catch {
          loadFailed = true;
          return [week.deckId, []] as const;
        }
      }),
    );

    if (loadFailed) {
      writePrintWindow(win, `<p>${t('printError')}</p>`);
      return;
    }

    const html = buildUnitPlanHtml({
      unit,
      groupName,
      wordsByDeck: Object.fromEntries(entries),
      labels: {
        canDoHeading: t('canDoHeading'),
        word: t('printWord'),
        meaning: t('printMeaning'),
        weekLine: (n, opens, due) => t('printWeekLine', { n, opens, due }),
        goalLine: (week) => {
          const text = goalLabel({
            required_accuracy: week.requiredAccuracy,
            required_mode: week.requiredMode,
          });
          return text ? t('printGoal', { goal: text }) : null;
        },
      },
      locale,
    });
    writePrintWindow(win, html);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: theme.radii.lg,
        border: `1px solid ${alpha(brand[300], 0.4)}`,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {renaming ? (
            <TextField
              autoFocus
              size="small"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              slotProps={{ htmlInput: { maxLength: 80 } }}
              sx={{ maxWidth: 260 }}
            />
          ) : (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography
                component="h3"
                sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary' }}
                noWrap
              >
                {title}
              </Typography>
              {unit.level && (
                <Chip
                  size="small"
                  label={unit.level}
                  sx={{ fontWeight: 700, bgcolor: alpha(brand[300], 0.25), color: brand[800] }}
                />
              )}
            </Stack>
          )}
          {summary && (
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.25 }}>
              {summary}
            </Typography>
          )}
        </Box>
        <IconButton
          aria-label={t('unitMenu', { title })}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <MoreVertIcon />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              startRename();
            }}
          >
            {t('rename')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onCopyUnit();
            }}
          >
            {t('copyUnit')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              void handlePrintUnit();
            }}
          >
            {t('printPlan')}
          </MenuItem>
        </Menu>
        <IconButton
          aria-label={expanded ? t('hideWeeks') : t('showWeeks')}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>

      {printPopupBlocked && (
        <Alert severity="warning" sx={{ mx: { xs: 1.5, sm: 2 }, mb: 1.5 }}>
          {tBuilder('sheetsPopupBlocked')}
        </Alert>
      )}

      <Collapse in={expanded}>
        <Stack spacing={1} sx={{ p: { xs: 1.5, sm: 2 }, pt: 0 }}>
          {canDoNotes.length > 0 && (
            <Box
              sx={{
                p: 1.25,
                borderRadius: theme.radii.md,
                bgcolor: alpha(brand[100], 0.4),
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.primary' }}>
                {t('canDoHeading')}
              </Typography>
              <Stack
                component="ul"
                spacing={0.25}
                sx={{ listStyle: 'disc', pl: 2.5, m: 0, mt: 0.5 }}
              >
                {canDoNotes.slice(0, CAN_DO_MAX).map((note, i) => (
                  <Typography
                    component="li"
                    key={i}
                    sx={{ fontSize: '0.8rem', color: 'text.secondary' }}
                  >
                    {note}
                  </Typography>
                ))}
              </Stack>
              {canDoNotes.length > CAN_DO_MAX && (
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                  {t('canDoMore', { n: canDoNotes.length - CAN_DO_MAX })}
                </Typography>
              )}
            </Box>
          )}

          {unit.weeks.map((week) => (
            <WeekRow
              key={week.deckId}
              week={week}
              onOpen={() => onOpenWeek(week)}
              onEdit={() => onEditWeek(week)}
              onShift={() => onShiftWeek(week)}
            />
          ))}

          {unit.weeks.length >= 1 && (
            <Button
              onClick={onAddWeek}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
            >
              {t('addWeek')}
            </Button>
          )}
        </Stack>
      </Collapse>
    </Paper>
  );
}
