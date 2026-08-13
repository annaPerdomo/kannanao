'use client';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';

import FuriganaText from '@/components/FuriganaText';
import { japaneseDateParts } from '@/lib/japaneseDate';
import type { CalendarEntry, Todo } from '@/types/todo';

import {
  formatWeekRange,
  isCompletedOnDate,
  isEntryOnDate,
  isScheduledForDate,
  todayISO,
  toISODate,
} from './helpers';

interface WeekStripProps {
  weekDates: Date[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
  weekOffset: number;
  onWeekChange: (delta: number) => void;
  todos: Todo[];
  entries: CalendarEntry[];
}

export function WeekStrip({
  weekDates,
  selectedDayIndex,
  onSelectDay,
  weekOffset,
  onWeekChange,
  todos,
  entries,
}: WeekStripProps) {
  const theme = useTheme();
  const { brand, accent, rainbow } = theme.palette;
  const locale = useLocale();
  const t = useTranslations('Todo.weekStrip');
  const todayStr = todayISO();

  // One colour per weekday, Mon→Sun — the app's own week palette, not the
  // design's fixed pastels, so every theme keeps its rainbow.
  const TAB_COLORS = [
    rainbow[50],
    rainbow[100],
    rainbow[200],
    rainbow[300],
    rainbow[400],
    rainbow[500],
    rainbow[600],
  ];

  const TODAY_BG = `linear-gradient(135deg, ${brand[600]}, ${accent[600]})`;

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          // Cells sit on a shared baseline so today's extra height shows as a
          // tab standing up out of the row, not as a taller box among equals.
          alignItems: 'end',
          // The seventh cell only fits on a phone at this gutter; any wider and
          // the week scrolls sideways, hiding the weekend behind a swipe.
          gap: { xs: 0.5, sm: 1 },
          mb: 0.75,
        }}
      >
        {weekDates.map((date, i) => {
          const dateISO = toISODate(date);
          const isSelected = i === selectedDayIndex;
          const isToday = dateISO === todayStr;
          const dayTodos = todos.filter((todo) => isScheduledForDate(todo, date));
          const dayCompleted = dayTodos.filter((todo) => isCompletedOnDate(todo, dateISO)).length;
          const dayEntries = entries.filter((entry) => isEntryOnDate(entry, date));
          const allDone = dayTodos.length > 0 && dayCompleted === dayTodos.length;
          const tabColor = TAB_COLORS[i % TAB_COLORS.length];
          // Today is the one tab that can't be left to the week palette: half of
          // those colours are yellows and limes, too light to carry legible type
          // either way. Every other tab keeps its week colour, with the
          // foreground chosen per colour rather than assumed to be white.
          const tabBg = isToday ? TODAY_BG : isSelected ? tabColor : alpha(tabColor, 0.45);
          const solid = isToday || isSelected;
          const solidText = isToday ? '#fff' : theme.palette.getContrastText(tabColor);
          const marker = allDone ? '💖' : dayEntries.length > 0 ? dayEntries[0].emoji : null;

          return (
            <Box
              key={dateISO}
              component="button"
              onClick={() => onSelectDay(i)}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date)}
              sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                // Centred both ways, so the stack sits in the middle of the tab
                // whatever it contains — with a marker, without one, tall or short.
                justifyContent: 'center',
                gap: 0.25,
                px: 0.25,
                pt: 0.75,
                pb: 1,
                // Today is simply a taller tab — the one cue that reads before
                // colour does, and the one selection can't take away. A fixed
                // height, not a minimum: only today may be taller, so nothing
                // else in the cell is allowed to change it.
                height: isToday ? { xs: 76, sm: 80 } : { xs: 62, sm: 66 },
                border: 'none',
                borderRadius: '10px',
                background: tabBg,
                color: solid ? solidText : 'text.primary',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                boxShadow: isToday
                  ? `0 10px 22px -8px ${alpha(brand[600], 0.55)}`
                  : isSelected
                    ? `0 8px 18px -8px ${alpha(tabColor, 0.75)}`
                    : 'none',
                minWidth: 0,
                '&:hover': {
                  background: isToday
                    ? `linear-gradient(135deg, ${brand[500]}, ${accent[500]})`
                    : isSelected
                      ? tabColor
                      : alpha(tabColor, 0.62),
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {/* The weekday in kanji with its reading — the strip teaches 月〜日
                  the same way the hero's date chip does, and in the same face:
                  the theme's `jp` stack is a serif in several schemes, which at
                  this size with a reading over it is a wall. */}
              <FuriganaText
                text={japaneseDateParts(date).weekday}
                showFurigana
                sx={{
                  display: 'block',
                  // The kanji leads — it's the part being learned; the date is
                  // the smaller supporting line under it. Both sit close to the
                  // page's own type scale: this is a widget on a dashboard, not
                  // a headline.
                  fontSize: { xs: '1.05rem', sm: '1.15rem' },
                  fontWeight: 700,
                  // Just enough leading to clear the ruby; more and the reading
                  // drifts away from the kanji it belongs to.
                  lineHeight: 1.55,
                  '& rt': { fontSize: '0.45em', fontWeight: 700, opacity: 0.85 },
                }}
              />
              <Typography
                component="span"
                sx={{
                  fontFamily: (th) => th.fonts.cute,
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                  fontWeight: 700,
                  lineHeight: 1,
                  color: solid ? solidText : 'text.primary',
                }}
              >
                {date.getDate()}
              </Typography>
              {/* Floated out of the stack: in flow it would push its day taller
                  than the rest of the week and muddy the one thing height is
                  supposed to mean here. */}
              {marker && (
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    bottom: 3,
                    right: { xs: 2, sm: 4 },
                    fontSize: { xs: '0.62rem', sm: '0.72rem' },
                    lineHeight: 1,
                  }}
                >
                  {marker}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Week navigation */}
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} mb={1.75}>
        <IconButton
          size="small"
          onClick={() => onWeekChange(weekOffset - 1)}
          aria-label={t('previousWeek')}
          sx={{ color: brand[500], p: 0.25 }}
        >
          <ChevronLeftRoundedIcon sx={{ fontSize: '1.1rem' }} />
        </IconButton>
        <Typography
          sx={{
            fontWeight: 800,
            color: brand[600],
            fontSize: '0.82rem',
            textAlign: 'center',
          }}
        >
          {formatWeekRange(weekDates, locale)}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onWeekChange(weekOffset + 1)}
          aria-label={t('nextWeek')}
          sx={{ color: brand[500], p: 0.25 }}
        >
          <ChevronRightRoundedIcon sx={{ fontSize: '1.1rem' }} />
        </IconButton>
      </Stack>
    </Box>
  );
}
