'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import type { Group } from '@/hooks/useGroups';
import { useKanaCourse } from '@/hooks/useKanaCourse';
import { fetchJsonCached } from '@/lib/apiCache';
import type { GroupKanaCoverage } from '@/lib/kanaChartPrintable';
import {
  type KanaCourseWeek,
  planKanaCourse,
  planKanaFromDecks,
  suggestKanaCourseStart,
} from '@/lib/kanaCourse';
import { setCharacters } from '@/lib/kanaCurriculum';
import { sb } from '@/lib/supabase';

import { nextSunday } from './constants';
import { KanaCourseAsk } from './KanaCourseAsk';
import {
  DEFAULT_KANA_COURSE_WEEKS,
  DEFAULT_ROWS_PER_WEEK,
  KANA_COURSE_LEAD_DAYS,
  KANA_COURSE_MAX_ROWS,
  KANA_COURSE_MAX_WEEKS,
  type KanaCourseForm,
} from './kanaCourseConstants';
import {
  includedCourseWeeks,
  KanaCourseReview,
  type KanaCourseSelection,
} from './KanaCourseReview';

interface KanaCourseBuilderProps {
  groups: Group[];
  groupId: string;
  onGroupChange: (groupId: string) => void;
}

const EMPTY_SELECTION: KanaCourseSelection = { skippedWeeks: [], skippedRows: [] };

/** The apply route writes rows x roster in one go, so a course is trimmed, never refused. */
function trimCourse(weeks: KanaCourseWeek[]): KanaCourseWeek[] {
  const kept: KanaCourseWeek[] = [];
  let rows = 0;
  for (const week of weeks.slice(0, KANA_COURSE_MAX_WEEKS)) {
    const room = KANA_COURSE_MAX_ROWS - rows;
    if (room <= 0) break;
    const setIds = week.setIds.slice(0, room);
    rows += setIds.length;
    kept.push({ ...week, setIds });
  }
  return kept;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function KanaCourseBuilder({ groups, groupId, onGroupChange }: KanaCourseBuilderProps) {
  const t = useTranslations('Materials.kanaCourse');
  const router = useRouter();
  const { source, loadingSource, applying, results, error, loadSource, apply, reset } =
    useKanaCourse();

  const [form, setForm] = useState<KanaCourseForm>(() => ({
    sourceKind: 'lessons',
    script: 'hiragana',
    fromSetId: null,
    rowsPerWeek: DEFAULT_ROWS_PER_WEEK,
    weeks: DEFAULT_KANA_COURSE_WEEKS,
    firstDueDate: nextSunday(),
    accuracy: null,
  }));
  const [coverage, setCoverage] = useState<GroupKanaCoverage | null>(null);
  const [weeks, setWeeks] = useState<KanaCourseWeek[] | null>(null);
  const [selection, setSelection] = useState<KanaCourseSelection>(EMPTY_SELECTION);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    // The source decides which rows get handed out, so a slow answer for the
    // group we just left must never be planned against the new one.
    void loadSource(groupId, () => cancelled);
    // Coverage only softens the copy and the suggested start, so a failed read
    // leaves the course plannable rather than blocking it.
    fetchJsonCached<GroupKanaCoverage>(
      `/api/group/kana-coverage?groupId=${encodeURIComponent(groupId)}`,
      authHeaders,
    )
      .then((data) => !cancelled && setCoverage(data))
      .catch(() => !cancelled && setCoverage(null));
    return () => {
      cancelled = true;
    };
  }, [groupId, loadSource]);

  useEffect(() => {
    if (!loadingSource && source && source.needs.length === 0 && form.sourceKind === 'lessons') {
      setForm((current) => ({ ...current, sourceKind: 'chart' }));
    }
  }, [loadingSource, source, form.sourceKind]);

  const patchForm = useCallback((patch: Partial<KanaCourseForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  const suggestedSetId = suggestKanaCourseStart(form.script, coverage ?? undefined);

  const build = useCallback(() => {
    const planned =
      form.sourceKind === 'lessons'
        ? planKanaFromDecks({
            needs: source?.needs ?? [],
            coverage: coverage ?? undefined,
            rowsPerWeek: form.rowsPerWeek,
            leadDays: KANA_COURSE_LEAD_DAYS,
          })
        : planKanaCourse({
            script: form.script,
            fromSetId: form.fromSetId,
            rowsPerWeek: form.rowsPerWeek,
            weeks: form.weeks,
            firstDueDate: form.firstDueDate,
            coverage: coverage ?? undefined,
          });
    setSelection(EMPTY_SELECTION);
    setWeeks(trimCourse(planned.weeks));
  }, [form, source, coverage]);

  const handleApply = useCallback(() => {
    if (!weeks) return;
    void apply({
      groupId,
      weeks: includedCourseWeeks(weeks, selection),
      requiredAccuracy: form.accuracy,
    });
  }, [weeks, selection, groupId, form.accuracy, apply]);

  const startOver = useCallback(() => {
    setWeeks(null);
    setSelection(EMPTY_SELECTION);
    reset();
  }, [reset]);

  if (results) {
    const sounds = results.assigned
      .map((setId) => setCharacters(setId))
      .filter(Boolean)
      .join('　');
    const nothingLanded = results.assigned.length === 0;
    return (
      <Stack spacing={2}>
        <Alert severity={nothingLanded ? 'error' : 'success'}>
          {nothingLanded
            ? t('appliedNothing')
            : t('appliedMessage', { rows: results.assigned.length, learners: results.memberCount })}
        </Alert>
        {sounds && <Alert severity="info">{t('appliedSounds', { sounds })}</Alert>}
        {results.failed.length > 0 && (
          <Alert severity="warning">
            {t('appliedFailed', {
              sounds: results.failed
                .map((setId) => setCharacters(setId))
                .filter(Boolean)
                .join('　'),
            })}
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {nothingLanded ? (
            <Button variant="contained" onClick={startOver}>
              {t('tryAgainButton')}
            </Button>
          ) : (
            <>
              <Button variant="contained" onClick={() => router.push(`/group/${groupId}`)}>
                {t('backToGroupButton')}
              </Button>
              <Button onClick={startOver} sx={{ textTransform: 'none' }}>
                {t('planAnotherButton')}
              </Button>
            </>
          )}
        </Box>
      </Stack>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {applying && <Loading message={t('applyingMessage')} />}

      {!applying && weeks === null && (
        <KanaCourseAsk
          groups={groups}
          groupId={groupId}
          form={form}
          deckCount={source?.needs.length ? (source.deckCount ?? 0) : 0}
          loadingSource={loadingSource}
          suggestedSetId={suggestedSetId}
          onGroupChange={onGroupChange}
          onChange={patchForm}
          onSubmit={build}
        />
      )}

      {!applying && weeks !== null && (
        <KanaCourseReview
          weeks={weeks}
          selection={selection}
          coverage={coverage}
          applying={applying}
          onSelectionChange={setSelection}
          onApply={handleApply}
          onStartOver={startOver}
        />
      )}
    </Box>
  );
}
