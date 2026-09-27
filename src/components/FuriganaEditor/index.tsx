'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Stack from '@mui/material/Stack';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { useKanjiReadings } from '@/hooks/useKanjiReadings';
import type { FuriganaSegment } from '@/lib/furigana';
import {
  dictionarySplit,
  isKana,
  joinGroups,
  readingGroups,
  reflowReadings,
  segmentsFromMarkup,
  segmentsToMarkup,
  splitAllByKanji,
  splitGroup,
  withReading,
} from '@/lib/furiganaEdit';
import { isUsualReading, type KanjiReadingDict } from '@/lib/kanjiReadings';
import { formatFurigana } from '@/services/api';

import { RubyWorkbench } from './RubyWorkbench';
import { SplitPicker } from './SplitPicker';
import { frameSx, type FuriganaSize, type ReadingTone, SIZES } from './styles';

export { frameSx, type FuriganaSize, SIZES } from './styles';

const stripBraceChars = (s: string) => s.replace(/[{|}]/g, '');

const plainText = (segments: FuriganaSegment[]) =>
  segments.map((seg) => (typeof seg === 'string' ? seg : seg.kanji)).join('');

function toneFor(kanji: string, reading: string, dict: KanjiReadingDict | null): ReadingTone {
  if (!isKana(reading)) return 'error';
  if (dict && Array.from(kanji).length === 1 && isUsualReading(kanji, reading, dict) === false) {
    return 'warning';
  }
  return 'ok';
}

export interface FuriganaEditorProps {
  value: string;
  onChange: (markup: string) => void;
  label?: string;
  autoFill?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  size?: FuriganaSize;
  actions?: ReactNode;
}

export function FuriganaEditor({
  value,
  onChange,
  label,
  autoFill = true,
  disabled,
  autoFocus,
  size = 'medium',
  actions,
}: FuriganaEditorProps) {
  const t = useTranslations('FuriganaEditor');
  const { data: dict } = useKanjiReadings();
  const [filling, setFilling] = useState(false);
  const [fillError, setFillError] = useState(false);
  const [pendingSplit, setPendingSplit] = useState<{
    index: number;
    at: number;
    kanji: string;
    anchor: HTMLElement;
  } | null>(null);
  const frameRef = useRef<HTMLFieldSetElement>(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  // Markup can't hold an empty reading, so a just-split `{駐|}{車|}` would
  // re-parse as one group; keep our own segments until the value changes from outside.
  const [segments, setSegments] = useState(() => segmentsFromMarkup(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setSegments(segmentsFromMarkup(value));
  }

  const commit = (next: FuriganaSegment[]) => {
    const markup = segmentsToMarkup(next);
    setSynced(markup);
    setSegments(next);
    setPendingSplit(null);
    onChange(markup);
  };

  const focusGroup = (index: number) =>
    requestAnimationFrame(() =>
      frameRef.current
        ?.querySelectorAll<HTMLInputElement>('input[data-reading-input]')
        [index]?.focus(),
    );

  const plain = plainText(segments);
  const groups = readingGroups(segments);
  const tones = groups.map((g) => toneFor(g.kanji, g.reading, dict));
  const warnings = [
    ...new Set(
      groups
        .filter((_, i) => tones[i] === 'warning')
        .map((g) => t('unusualReading', { kanji: g.kanji, reading: g.reading })),
    ),
  ];
  const busy = disabled || filling;
  const canSplitAll =
    !!dict && segmentsToMarkup(splitAllByKanji(segments, dict)) !== segmentsToMarkup(segments);

  const handleSplit = (index: number, at: number, anchor: HTMLElement) => {
    const group = groups[index];
    const readings: [string, string] | null = !group.reading
      ? ['', '']
      : dict && dictionarySplit(group, at, dict);
    if (readings) {
      commit(splitGroup(segments, index, at, readings));
      focusGroup(index);
    } else {
      setPendingSplit({ index, at, kanji: group.kanji, anchor });
    }
  };

  const handleAutoFill = async () => {
    setFilling(true);
    setFillError(false);
    try {
      const [result] = await formatFurigana([segmentsToMarkup(segments)]);
      if (!mounted.current || typeof result !== 'string') return;
      const next = segmentsFromMarkup(result);
      commit(dict ? splitAllByKanji(next, dict) : next);
    } catch {
      if (mounted.current) setFillError(true);
    } finally {
      if (mounted.current) setFilling(false);
    }
  };

  const fieldLabel = label ?? t('sentence');

  return (
    <Box
      component="fieldset"
      ref={frameRef}
      sx={[
        frameSx(size),
        (theme) => ({ '&:focus-within': { borderColor: theme.palette.brand[400] } }),
      ]}
    >
      <legend>{fieldLabel}</legend>
      <InputBase
        value={plain}
        onChange={(e) => commit(reflowReadings(stripBraceChars(e.target.value), segments))}
        multiline
        fullWidth
        disabled={busy}
        autoFocus={autoFocus}
        inputProps={{ 'aria-label': fieldLabel }}
        sx={{ fontSize: SIZES[size].text, fontWeight: 600, py: 0.5, lineHeight: 1.6 }}
      />

      {plain && (
        <RubyWorkbench
          segments={segments}
          tones={tones}
          warnings={warnings}
          size={size}
          disabled={busy}
          filling={filling}
          onReadingChange={(i, reading) =>
            commit(withReading(segments, i, stripBraceChars(reading)))
          }
          onJoin={(i) => {
            commit(joinGroups(segments, i));
            focusGroup(i);
          }}
          onSplit={handleSplit}
          onSplitAll={
            canSplitAll && dict ? () => commit(splitAllByKanji(segments, dict)) : undefined
          }
          onAutoFill={autoFill ? () => void handleAutoFill() : undefined}
        />
      )}

      {pendingSplit && groups[pendingSplit.index]?.kanji === pendingSplit.kanji && (
        <SplitPicker
          group={groups[pendingSplit.index]}
          at={pendingSplit.at}
          anchor={pendingSplit.anchor}
          dict={dict}
          onClose={() => {
            setPendingSplit(null);
            focusGroup(pendingSplit.index);
          }}
          onPick={(readings) => {
            commit(splitGroup(segments, pendingSplit.index, pendingSplit.at, readings));
            focusGroup(pendingSplit.index);
          }}
        />
      )}

      {fillError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {t('autoFillFailed')}
        </Alert>
      )}

      {actions && (
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
          {actions}
        </Stack>
      )}
    </Box>
  );
}
