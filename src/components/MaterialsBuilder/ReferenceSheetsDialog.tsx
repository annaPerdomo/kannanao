'use client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DataErrorState } from '@/components/DataErrorState';
import { StyledDialog } from '@/components/StyledDialog';
import { fetchJsonCached } from '@/lib/apiCache';
import { type DataError, toDataError } from '@/lib/dataError';
import {
  buildGroupKanaChartHtml,
  buildKanaChartPrintableHtml,
  buildKanjiSheetHtml,
  type GroupKanaCoverage,
  type KanaSheetLabels,
  type KanaSheetScript,
} from '@/lib/kanaChartPrintable';
import { includedPlan } from '@/lib/lessonPlanEdits';
import { openBlankPrintWindow, openPrintWindow, writePrintWindow } from '@/lib/lessonPrintable';
import { sb } from '@/lib/supabase';
import type { LessonPlan } from '@/types/lessonPlan';

interface ReferenceSheetsDialogProps {
  open: boolean;
  onClose: () => void;
  plan: LessonPlan;
  groupId?: string;
}

const SCRIPTS: KanaSheetScript[] = ['hiragana', 'katakana', 'both'];

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function fetchCoverage(groupId: string): Promise<GroupKanaCoverage> {
  return fetchJsonCached<GroupKanaCoverage>(
    `/api/group/kana-coverage?groupId=${encodeURIComponent(groupId)}`,
    authHeaders,
  );
}

export function ReferenceSheetsDialog({
  open,
  onClose,
  plan,
  groupId,
}: ReferenceSheetsDialogProps) {
  const t = useTranslations('Group.lessonBuilder');
  const tJourney = useTranslations('KanaJourney.journey');
  const tContextual = useTranslations('KanaJourney.contextual');
  const locale = useLocale();

  const [script, setScript] = useState<KanaSheetScript>('hiragana');
  const [romaji, setRomaji] = useState(true);
  const [blank, setBlank] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [groupError, setGroupError] = useState<DataError | null>(null);
  const [groupEmpty, setGroupEmpty] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  // The dialog never unmounts, so without this the previous group's alert is
  // still on screen the next time a teacher opens it.
  useEffect(() => {
    if (!open) return;
    setGroupError(null);
    setGroupEmpty(false);
    setPopupBlocked(false);
  }, [open]);

  const hasKanjiSource = useMemo(() => includedPlan(plan).decks.length > 0, [plan]);

  const sheetLabels = useCallback(
    (title: string, hint: string): KanaSheetLabels => ({
      title,
      hint,
      name: t('printNameLabel'),
      date: t('printDateLabel'),
      markedBlock: tJourney('markedBlock'),
      comboBlock: tJourney('comboBlock'),
      contextualBlock: tJourney('contextualBlock'),
      contextual: {
        littleTsu: tContextual('littleTsu'),
        longSound: tContextual('longSound'),
      },
    }),
    [t, tJourney, tContextual],
  );

  const printKana = useCallback(() => {
    const labels = blank
      ? sheetLabels(t('sheetsBlankTitle'), t('sheetsBlankHint'))
      : sheetLabels(t('sheetsKanaTitle'), t('sheetsKanaHint'));
    setPopupBlocked(
      !openPrintWindow(
        buildKanaChartPrintableHtml({ locale, options: { script, romaji, blank }, labels }),
      ),
    );
  }, [blank, locale, romaji, script, sheetLabels, t]);

  const printGroup = useCallback(() => {
    if (!groupId) return;
    // Claimed before the fetch, not after: Safari only allows window.open while
    // the click is still on the stack.
    const win = openBlankPrintWindow();
    if (!win) {
      setPopupBlocked(true);
      return;
    }
    setPopupBlocked(false);
    setGroupError(null);
    setGroupEmpty(false);
    setLoadingGroup(true);

    void (async () => {
      try {
        const coverage = await fetchCoverage(groupId);
        if (coverage.learnerCount === 0) {
          win.close();
          setGroupEmpty(true);
          return;
        }
        writePrintWindow(
          win,
          buildGroupKanaChartHtml({
            locale,
            script,
            coverage,
            labels: {
              ...sheetLabels(t('sheetsGroupTitle'), t('sheetsGroupHint')),
              // A wall chart has nothing to hand in.
              name: undefined,
              date: undefined,
              legend: t('sheetsGroupLegend', { count: coverage.learnerCount }),
              trackTitle: {
                hiragana: tJourney('hiraganaTrack'),
                katakana: tJourney('katakanaTrack'),
              },
            },
          }),
        );
      } catch (err) {
        win.close();
        setGroupError(toDataError(err));
      } finally {
        setLoadingGroup(false);
      }
    })();
  }, [groupId, locale, script, sheetLabels, t, tJourney]);

  const printKanji = useCallback(() => {
    const kept = includedPlan(plan);
    setPopupBlocked(
      !openPrintWindow(
        buildKanjiSheetHtml({
          locale,
          weeks: kept.decks.map((deck, i) => ({
            heading: `${t('weekHeading', { week: i + 1 })} — ${deck.name}`,
            deck,
          })),
          labels: {
            title: t('sheetsKanjiTitle'),
            name: t('printNameLabel'),
            date: t('printDateLabel'),
            empty: t('sheetsKanjiEmpty'),
          },
        }),
      ),
    );
  }, [locale, plan, t]);

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('sheetsTitle')}
      subtitle={t('sheetsSubtitle')}
      icon="🖨️"
      titleId="reference-sheets-title"
      maxWidth="sm"
    >
      <Stack spacing={2.5}>
        <FormControl>
          <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 700 }}>
            {t('sheetsScriptLabel')}
          </FormLabel>
          <RadioGroup
            value={script}
            onChange={(e) => setScript(e.target.value as KanaSheetScript)}
            row
          >
            {SCRIPTS.map((value) => (
              <FormControlLabel
                key={value}
                value={value}
                control={<Radio size="small" />}
                label={
                  value === 'both'
                    ? t('sheetsScriptBoth')
                    : tJourney(value === 'hiragana' ? 'hiraganaTrack' : 'katakanaTrack')
                }
              />
            ))}
          </RadioGroup>
        </FormControl>

        <Divider />

        {popupBlocked && <Alert severity="warning">{t('sheetsPopupBlocked')}</Alert>}
        {groupError && <DataErrorState error={groupError} dense />}
        {groupEmpty && <Alert severity="info">{t('sheetsGroupEmpty')}</Alert>}

        <Stack spacing={2}>
          {/* The two toggles only shape the kana chart, so they sit with its button. */}
          <Stack spacing={1}>
            <Stack>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={romaji}
                    onChange={(e) => setRomaji(e.target.checked)}
                  />
                }
                label={t('sheetsRomajiToggle')}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={blank}
                    onChange={(e) => setBlank(e.target.checked)}
                  />
                }
                label={t('sheetsBlankToggle')}
              />
            </Stack>
            <Button variant="contained" onClick={printKana}>
              {t('sheetsKanaButton')}
            </Button>
          </Stack>

          <Stack spacing={1}>
            {!!groupId && (
              <Button variant="outlined" onClick={printGroup} disabled={loadingGroup}>
                {loadingGroup ? t('sheetsGroupLoading') : t('sheetsGroupButton')}
              </Button>
            )}
            <Button variant="outlined" onClick={printKanji} disabled={!hasKanjiSource}>
              {t('sheetsKanjiButton')}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </StyledDialog>
  );
}
