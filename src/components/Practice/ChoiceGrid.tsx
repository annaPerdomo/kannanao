'use client';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Grid, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

interface ChoiceGridProps {
  choices: string[];
  /** The choice that is the right answer — used to colour the grid after a pick. */
  correct: string;
  /** The learner's pick, or null while the question is still open. */
  selected: string | null;
  onSelect: (choice: string) => void;
}

/**
 * The four-option answer grid shared by the meaning-picking practice modes
 * (Guess It! and Listen): A–D labels while unanswered, then green/red result
 * states once a choice is locked in.
 */
export function ChoiceGrid({ choices, correct, selected, onSelect }: ChoiceGridProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  return (
    <Grid container spacing={1.5} sx={{ mb: 2 }}>
      {choices.map((choice, i) => {
        const isThisCorrect = choice === correct;
        const isThisSelected = selected === choice;

        let borderColor: string = alpha(brand[200], 0.7);
        let bgcolor: string = surfaces.input;
        let textColor = 'text.primary';
        let iconEl: React.ReactNode = null;

        if (selected) {
          if (isThisCorrect) {
            borderColor = theme.palette.success.main;
            bgcolor = alpha(theme.palette.success.main, 0.1);
            textColor = 'success.dark';
            iconEl = <CheckIcon sx={{ color: 'success.main', flexShrink: 0 }} />;
          } else if (isThisSelected) {
            borderColor = theme.palette.error.main;
            bgcolor = alpha(theme.palette.error.main, 0.08);
            textColor = 'error.dark';
            iconEl = <CloseIcon sx={{ color: 'error.main', flexShrink: 0 }} />;
          }
        }

        const pick = () => {
          if (!selected) onSelect(choice);
        };

        return (
          <Grid size={{ xs: 12, sm: 6 }} key={choice}>
            <Box
              role="button"
              tabIndex={selected ? -1 : 0}
              aria-disabled={!!selected}
              aria-label={`Answer ${CHOICE_LABELS[i]}: ${choice}`}
              onClick={pick}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pick();
                }
              }}
              sx={{
                p: 2,
                border: '2px solid',
                borderRadius: 2,
                cursor: selected ? 'default' : 'pointer',
                borderColor,
                bgcolor,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                minHeight: 64,
                transition: 'all 0.2s',
                transform: selected && isThisCorrect ? 'scale(1.02)' : 'scale(1)',
                '&:hover': !selected
                  ? {
                      borderColor: brand[500],
                      bgcolor: alpha(brand[300], 0.15),
                      transform: 'scale(1.02)',
                    }
                  : {},
              }}
            >
              {/* Circle label, replaced by the result icon once answered */}
              {selected && iconEl ? (
                iconEl
              ) : (
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: `2px solid ${alpha(brand[300], selected ? 0.3 : 0.4)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    opacity: selected ? 0.4 : 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: selected ? undefined : 'text.secondary', fontWeight: 700 }}
                  >
                    {CHOICE_LABELS[i]}
                  </Typography>
                </Box>
              )}

              <Typography
                sx={{
                  color: textColor,
                  fontWeight: isThisSelected || (!!selected && isThisCorrect) ? 600 : 400,
                  flexGrow: 1,
                }}
              >
                {choice}
              </Typography>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
