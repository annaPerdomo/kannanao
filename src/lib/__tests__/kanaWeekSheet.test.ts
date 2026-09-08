import { describe, expect, it } from 'vitest';

import { buildKanaChartPrintableHtml, type KanaSheetLabels } from '@/lib/kanaChartPrintable';

const LABELS: KanaSheetLabels = {
  title: "This week's sounds",
  markedBlock: 'Marked',
  comboBlock: 'Combo',
  contextualBlock: 'Contextual',
  contextual: {},
};

const sheet = (setIds: string[], script: 'hiragana' | 'katakana' | 'both' = 'both') =>
  buildKanaChartPrintableHtml({
    locale: 'en',
    options: { script, romaji: true, blank: false, setIds },
    labels: LABELS,
  });

describe('a week sheet', () => {
  it('prints every assigned row when a week mixes the two scripts', () => {
    const html = sheet(['hira-a', 'kata-a']);
    expect(html).toContain('あ');
    expect(html).toContain('ア');
  });

  it('prints katakana rows even when the course script says both', () => {
    const html = sheet(['kata-ka']);
    expect(html).toContain('カ');
    expect(html).not.toContain('か');
  });

  it('leaves out the rows the week does not cover', () => {
    expect(sheet(['hira-a'], 'hiragana')).not.toContain('か');
  });

  it('still prints the whole merged chart when no rows are named', () => {
    const html = buildKanaChartPrintableHtml({
      locale: 'en',
      options: { script: 'both', romaji: true, blank: false },
      labels: LABELS,
    });
    expect(html).toContain('あ');
    expect(html).toContain('ア');
  });
});
