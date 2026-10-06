import { formatDate } from '@/components/Group/dueDate';
import type { LessonUnit, LessonUnitWeek } from '@/types/lessonUnit';

import { furiganaFromReading } from './furigana';
import { escapeHtml, furiganaToRubyHtml, PRINT_BASE_CSS } from './lessonPrintable';

export interface UnitPlanWord {
  word: string;
  reading: string | null;
  meaning: string;
}

export interface UnitPlanLabels {
  canDoHeading: string;
  word: string;
  meaning: string;
  weekLine: (n: number, opens: string, due: string) => string;
  /** Resolves a week's goal text (via `useGoalLabel`, a hook this pure module can't call) or null. */
  goalLine: (week: LessonUnitWeek) => string | null;
}

const PAGE_CSS = `
  ${PRINT_BASE_CSS}
  header { margin-bottom: 18px; }
  h1 { font-size: 1.3rem; margin: 0 0 4px; }
  h2 { font-size: 1.05rem; margin: 0 0 4px; }
  .groupline { font-size: 0.85rem; color: #555; margin: 0; }
  .candos { margin-bottom: 20px; }
  .candos ul { margin: 4px 0 0; padding-left: 20px; }
  section.week { page-break-inside: avoid; margin-bottom: 22px; }
  .goal { font-size: 0.85rem; color: #555; margin: 0 0 4px; }
  .candoline { font-size: 0.85rem; color: #555; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 0.9rem; }
  th { background: #f2f2f2; font-size: 0.75rem; }
  td.num { width: 2.2em; text-align: center; color: #777; }
  ruby rt { font-size: 0.55em; }
`;

function wordCellHtml(word: UnitPlanWord): string {
  const marked = word.reading ? furiganaFromReading(word.word, word.reading) : null;
  return marked ? furiganaToRubyHtml(marked) : escapeHtml(word.word);
}

function wordRow(word: UnitPlanWord, index: number): string {
  return `<tr>
    <td class="num">${index + 1}</td>
    <td class="jp">${wordCellHtml(word)}</td>
    <td>${escapeHtml(word.meaning)}</td>
  </tr>`;
}

function weekSection(
  week: LessonUnitWeek,
  words: UnitPlanWord[],
  labels: UnitPlanLabels,
  locale: string,
): string {
  const opens = week.availableOn ? formatDate(week.availableOn, locale) : '';
  const due = week.dueDate ? formatDate(week.dueDate, locale) : '';
  const goal = labels.goalLine(week);
  const rows = words.map((w, i) => wordRow(w, i)).join('\n');

  return `<section class="week">
  <h2>${escapeHtml(labels.weekLine(week.week ?? 0, opens, due))}</h2>
  ${goal ? `<p class="goal">${escapeHtml(goal)}</p>` : ''}
  ${week.note ? `<p class="candoline">${escapeHtml(week.note)}</p>` : ''}
  <table>
    <thead><tr><th></th><th>${escapeHtml(labels.word)}</th><th>${escapeHtml(labels.meaning)}</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
</section>`;
}

export function buildUnitPlanHtml(args: {
  unit: LessonUnit;
  groupName: string;
  wordsByDeck: Record<string, UnitPlanWord[]>;
  labels: UnitPlanLabels;
  locale: string;
}): string {
  const { unit, groupName, wordsByDeck, labels, locale } = args;
  const title = unit.title ?? '';

  const canDoNotes = unit.weeks.map((w) => w.note).filter((n): n is string => Boolean(n));
  const canDoBlock =
    canDoNotes.length > 0
      ? `<div class="candos">
    <h2>${escapeHtml(labels.canDoHeading)}</h2>
    <ul>${canDoNotes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
  </div>`
      : '';

  const sections = unit.weeks
    .map((week) => weekSection(week, wordsByDeck[week.deckId] ?? [], labels, locale))
    .join('\n');

  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${PAGE_CSS}</style>
</head>
<body>
<header>
  <h1>${escapeHtml(title)}</h1>
  <p class="groupline">${escapeHtml(groupName)}${unit.level ? ` · ${escapeHtml(unit.level)}` : ''}</p>
</header>
${canDoBlock}
${sections}
<script>window.addEventListener('load', function () { window.print(); });</script>
</body>
</html>`;
}
