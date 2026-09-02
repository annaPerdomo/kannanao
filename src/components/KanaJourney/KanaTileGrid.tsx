'use client';
import { Box, Grid, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

interface KanaTileGridProps {
  choices: string[];
  correct: string;
  selected: string | null;
  onSelect: (kana: string) => void;
}

// Word-pair choices are whole words, not single characters: a fixed 3rem tile
// would push きって past the edge of a half-width column on a phone.
function tileFontSize(choices: string[]) {
  const longest = Math.max(0, ...choices.map((choice) => [...choice].length));
  if (longest <= 2) return { xs: '2.4rem', sm: '3rem' };
  if (longest <= 4) return { xs: '1.7rem', sm: '2.1rem' };
  return { xs: '1.3rem', sm: '1.6rem' };
}

export function KanaTileGrid({ choices, correct, selected, onSelect }: KanaTileGridProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const fontSize = tileFontSize(choices);

  return (
    <Grid container spacing={{ xs: 1, sm: 1.5 }}>
      {choices.map((choice) => {
        const isThisCorrect = choice === correct;
        const isThisSelected = selected === choice;

        let borderColor: string = alpha(brand[200], 0.7);
        let bgcolor: string = surfaces.input;
        if (selected) {
          if (isThisCorrect) {
            borderColor = theme.palette.success.main;
            bgcolor = alpha(theme.palette.success.main, 0.1);
          } else if (isThisSelected) {
            borderColor = theme.palette.error.main;
            bgcolor = alpha(theme.palette.error.main, 0.08);
          }
        }

        const pick = () => {
          if (!selected) onSelect(choice);
        };

        return (
          <Grid size={6} key={choice}>
            <Box
              role="button"
              tabIndex={selected ? -1 : 0}
              aria-disabled={!!selected}
              aria-label={choice}
              onClick={pick}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pick();
                }
              }}
              sx={{
                border: '2px solid',
                borderRadius: 3,
                borderColor,
                bgcolor,
                cursor: selected ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: { xs: 76, sm: 92 },
                transition: 'all 0.2s',
                '&:hover': !selected
                  ? { borderColor: brand[500], bgcolor: alpha(brand[300], 0.15) }
                  : {},
              }}
            >
              <Typography component="span" sx={{ fontSize, lineHeight: 1, color: 'text.primary' }}>
                {choice}
              </Typography>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
