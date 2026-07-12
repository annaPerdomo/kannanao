import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import type { MemberDetail } from '@/hooks/useGroup';

type WeakWords = MemberDetail['weakWords'];

interface TrickyWordsProps {
  weakWords: WeakWords;
}

/**
 * Collapsed "Tricky words" list for a single member — the words they miss most,
 * worst-first. Deliberately plain: word / reading / meaning and a ✗-count chip,
 * no charts. Hidden until the teacher opens it so it doesn't crowd the summary.
 */
export function TrickyWords({ weakWords }: TrickyWordsProps) {
  const theme = useTheme();
  const { brand, error } = theme.palette;

  if (weakWords.length === 0) return null;

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        mb: 3,
        border: `1px solid ${alpha(brand[300], 0.3)}`,
        borderRadius: '12px !important',
        bgcolor: alpha(brand[50], 0.4),
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: brand[600] }} />}
        aria-label="Toggle tricky words"
        sx={{ px: 1.5 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReportProblemIcon sx={{ fontSize: 18, color: error.main }} />
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.85rem',
              color: brand[700],
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Tricky words
          </Typography>
          <Chip
            label={weakWords.length}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 700,
              bgcolor: alpha(error.main, 0.12),
              color: error.main,
            }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.5 }}>
        {weakWords.map((w) => (
          <Paper
            key={w.cardId}
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              p: 1.25,
              mb: 0.75,
              border: `1px solid ${alpha(brand[300], 0.25)}`,
              borderRadius: 2,
              bgcolor: alpha('#FFFFFF', 0.5),
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: brand[800] }} noWrap>
                  {w.word}
                </Typography>
                {w.reading && (
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }} noWrap>
                    {w.reading}
                  </Typography>
                )}
              </Box>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>
                {w.meaning || '—'}
                <Box component="span" sx={{ color: alpha(brand[500], 0.7), ml: 0.75 }}>
                  · {w.deckName}
                </Box>
              </Typography>
            </Box>
            <Chip
              label={`✗ ${w.wrongCount}`}
              size="small"
              aria-label={`Missed ${w.wrongCount} times`}
              sx={{
                flexShrink: 0,
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 700,
                bgcolor: alpha(error.main, 0.12),
                color: error.main,
              }}
            />
          </Paper>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
