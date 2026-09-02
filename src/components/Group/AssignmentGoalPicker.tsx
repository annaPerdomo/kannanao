'use client';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { GOAL_ACCURACY_CHOICES, GOAL_MODES, type GoalMode } from '@/lib/assignmentMastery';

import { goalModeMessageKey } from './useGoalLabel';

interface AssignmentGoalPickerProps {
  accuracy: number | null;
  mode: GoalMode | null;
  onAccuracyChange: (accuracy: number | null) => void;
  onModeChange: (mode: GoalMode | null) => void;
  /** Modes the chosen deck can't answer — offering them would set an impossible goal. */
  unavailableModes?: readonly GoalMode[];
  /** A kana goal's activity is fixed, so the whole mode question is dropped. */
  hideModes?: boolean;
}

/**
 * Collapsed-by-default "Add a goal (optional)" disclosure for the assignment
 * dialog. Without opening it, creating an assignment is exactly as easy as
 * before; opening it reveals a practice-mode picker and simple accuracy chips.
 */
export function AssignmentGoalPicker({
  accuracy,
  mode,
  onAccuracyChange,
  onModeChange,
  unavailableModes = [],
  hideModes = false,
}: AssignmentGoalPickerProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.goalPicker');
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((o) => !o);

  const chipSx = (selected: boolean) => ({
    px: 1.5,
    py: 0.75,
    borderRadius: 2,
    border: `1.5px solid ${selected ? brand[500] : alpha(brand[300], 0.4)}`,
    bgcolor: selected ? alpha(brand[100], 0.8) : 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    '&:hover': { borderColor: brand[400] },
  });

  const chipTextSx = { fontSize: '0.8rem', fontWeight: 600, color: brand[800] };

  const chip = (selected: boolean, label: string, onClick: () => void) => (
    <Box
      key={label}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={chipSx(selected)}
    >
      <Typography sx={chipTextSx}>{label}</Typography>
    </Box>
  );

  return (
    <Box>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          width: 'fit-content',
          borderRadius: 1,
        }}
      >
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: brand[600] }}>
          {t('addGoal')}
        </Typography>
        {open ? (
          <ExpandLessIcon sx={{ fontSize: 18, color: brand[500] }} />
        ) : (
          <ExpandMoreIcon sx={{ fontSize: 18, color: brand[500] }} />
        )}
      </Box>

      <Collapse in={open}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
          <Box>
            <Typography
              sx={{
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: brand[500],
                mb: 1,
              }}
            >
              {t('scoreToBeat')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {chip(accuracy === null, t('noScoreGoal'), () => onAccuracyChange(null))}
              {GOAL_ACCURACY_CHOICES.map((pct) =>
                chip(accuracy === pct, `${pct}%`, () => onAccuracyChange(pct)),
              )}
            </Box>
          </Box>

          {!hideModes && (
            <Box>
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: brand[500],
                  mb: 1,
                }}
              >
                {t('inWhichActivity')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {chip(mode === null, t('anyActivity'), () => onModeChange(null))}
                {GOAL_MODES.filter((m) => !unavailableModes.includes(m)).map((m) =>
                  chip(mode === m, t(`modes.${goalModeMessageKey(m)}`), () => onModeChange(m)),
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
