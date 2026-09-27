import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FuriganaEditor } from '@/components/FuriganaEditor';
import { renderWithProviders } from '@/test/renderWithProviders';

function ControlledEditor({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <FuriganaEditor value={value} onChange={setValue} />;
}

vi.mock('@/services/api', () => ({
  formatFurigana: vi.fn(),
}));

vi.mock('@/hooks/useKanjiReadings', () => {
  const data = new Map([
    ['駐', ['ちゅう']],
    ['車', ['しゃ', 'くるま']],
    ['今', ['こん', 'いま']],
    ['日', ['にち', 'ひ']],
    ['私', ['し', 'わたし']],
  ]);
  return { useKanjiReadings: () => ({ data, loading: false, error: false }) };
});

import { formatFurigana } from '@/services/api';

describe('FuriganaEditor', () => {
  it('renders one reading input per kanji group with the current readings', () => {
    renderWithProviders(<FuriganaEditor value="{私|わたし}は{話|はな}す" onChange={vi.fn()} />);

    expect(screen.getByDisplayValue('わたし')).toBeInTheDocument();
    expect(screen.getByDisplayValue('はな')).toBeInTheDocument();
  });

  it('keeps per-kanji readings as stored, one input per kanji', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <FuriganaEditor value="{駐|ちゅう}{車|しゃ}は{禁|きん}{止|し}" onChange={onChange} />,
    );

    expect(screen.getByLabelText('Reading for 駐')).toHaveValue('ちゅう');
    expect(screen.getByLabelText('Reading for 車')).toHaveValue('しゃ');

    fireEvent.change(screen.getByLabelText('Reading for 止'), { target: { value: 'し!' } });
    expect(onChange).toHaveBeenCalledWith('{駐|ちゅう}{車|しゃ}は{禁|きん}{止|し!}');
  });

  it('joins two kanji into one reading for jukujikun', () => {
    renderWithProviders(<ControlledEditor initial="{今|きょ}{日|う}は" />);

    fireEvent.click(screen.getByRole('button', { name: 'Join 今 and 日 into one reading' }));

    expect(screen.getByLabelText('Reading for 今日')).toHaveValue('きょう');
    expect(screen.queryByLabelText('Reading for 今')).not.toBeInTheDocument();
  });

  it('splits a whole-word reading with the dictionary when it knows the kanji', () => {
    const onChange = vi.fn();
    renderWithProviders(<FuriganaEditor value="{駐車|ちゅうしゃ}" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Give 駐 and 車 their own readings' }));

    expect(onChange).toHaveBeenLastCalledWith('{駐|ちゅう}{車|しゃ}');
    expect(screen.queryByText("Where does 駐's reading end?")).not.toBeInTheDocument();
  });

  it('asks where the reading breaks when the dictionary cannot tell', () => {
    const onChange = vi.fn();
    renderWithProviders(<FuriganaEditor value="{禁止|きんし}" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Give 禁 and 止 their own readings' }));
    expect(screen.getByText("Where does 禁's reading end?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '禁 きん, 止 し' }));
    expect(onChange).toHaveBeenLastCalledWith('{禁|きん}{止|し}');
  });

  it('keeps an empty side of a split as its own input', () => {
    renderWithProviders(<ControlledEditor initial="{禁止|きんし}" />);

    fireEvent.click(screen.getByRole('button', { name: 'Give 禁 and 止 their own readings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leave them blank and type' }));

    expect(screen.getByLabelText('Reading for 禁')).toHaveValue('');
    expect(screen.getByLabelText('Reading for 止')).toHaveValue('');
  });

  it('Split by kanji divides every whole-word reading the dictionary can', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <FuriganaEditor value="{今日|きょう}は{駐車|ちゅうしゃ}" onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Split by kanji' }));
    expect(onChange).toHaveBeenLastCalledWith('{今日|きょう}は{駐|ちゅう}{車|しゃ}');
  });

  it('warns when a kanji is given a reading it does not have', () => {
    renderWithProviders(<FuriganaEditor value="{駐|ちゅ}{車|しゃ}" onChange={vi.fn()} />);

    expect(screen.getByText(/駐 isn't usually read ちゅ/)).toBeInTheDocument();
    expect(screen.queryByText(/車 isn't usually read/)).not.toBeInTheDocument();
  });

  it('renders actions inside the frame and hides the readings panel for an empty sentence', () => {
    renderWithProviders(
      <FuriganaEditor value="" onChange={vi.fn()} actions={<button type="button">Done</button>} />,
    );

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.queryByText('Readings')).not.toBeInTheDocument();
  });

  it('typing in a reading input calls onChange with updated markup', () => {
    const onChange = vi.fn();
    renderWithProviders(<FuriganaEditor value="{私|わたし}は" onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue('わたし'), { target: { value: 'わたくし' } });
    expect(onChange).toHaveBeenCalledWith('{私|わたくし}は');
  });

  it('editing the sentence text keeps an unchanged group reading and reflows markup', () => {
    const onChange = vi.fn();
    renderWithProviders(<FuriganaEditor value="{私|わたし}は{話|はな}す" onChange={onChange} />);

    const sentenceField = screen.getByLabelText('Sentence');
    fireEvent.change(sentenceField, { target: { value: '私はもう話す' } });
    expect(onChange).toHaveBeenCalledWith('{私|わたし}はもう{話|はな}す');
  });

  it('auto-fill passes the result to onChange, split per kanji where the dictionary can', async () => {
    const onChange = vi.fn();
    vi.mocked(formatFurigana).mockResolvedValue(['{駐車|ちゅうしゃ}は{私|わたし}']);
    renderWithProviders(<FuriganaEditor value="駐車は私" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Fill in readings' }));

    await screen.findByRole('button', { name: 'Fill in readings' });
    expect(formatFurigana).toHaveBeenCalledWith(['駐車は私']);
    expect(onChange).toHaveBeenCalledWith('{駐|ちゅう}{車|しゃ}は{私|わたし}');
  });

  it('locks the readings while auto-fill runs so edits are not overwritten', async () => {
    let resolve: (lines: string[]) => void = () => {};
    vi.mocked(formatFurigana).mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithProviders(<ControlledEditor initial="{駐車|ちゅうしゃ}" />);

    fireEvent.click(screen.getByRole('button', { name: 'Fill in readings' }));

    expect(screen.getByLabelText('Reading for 駐車')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Give 駐 and 車 their own readings' }),
    ).toBeDisabled();
    resolve(['{駐|ちゅう}{車|しゃ}']);
    expect(await screen.findByLabelText('Reading for 駐')).not.toBeDisabled();
  });

  it('shows one warning per distinct unusual reading', () => {
    renderWithProviders(<FuriganaEditor value="{駐|ちゅ}と{駐|ちゅ}" onChange={vi.fn()} />);

    expect(screen.getAllByText(/駐 isn't usually read ちゅ/)).toHaveLength(1);
  });

  it('shows the error alert when auto-fill rejects', async () => {
    vi.mocked(formatFurigana).mockRejectedValue(new Error('nope'));
    renderWithProviders(<FuriganaEditor value="私は話す" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Fill in readings' }));

    expect(await screen.findByText("Couldn't fill in readings. Try again.")).toBeInTheDocument();
  });

  it('shows the kanaOnly helper text for a non-kana reading', () => {
    renderWithProviders(<FuriganaEditor value="{私|watashi}は" onChange={vi.fn()} />);

    expect(screen.getByText('Kana only')).toBeInTheDocument();
  });

  it('renders one input per kanji run even with no markup yet', () => {
    renderWithProviders(<FuriganaEditor value="私は話す" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Reading for 私')).toBeInTheDocument();
    expect(screen.getByLabelText('Reading for 話')).toBeInTheDocument();
  });

  it('keeps a reading input mounted after its reading is cleared', () => {
    renderWithProviders(<ControlledEditor initial="{私|わたし}は" />);

    fireEvent.change(screen.getByDisplayValue('わたし'), { target: { value: '' } });

    expect(screen.getByLabelText('Reading for 私')).toBeInTheDocument();
    expect(screen.getByLabelText('Reading for 私')).toHaveValue('');
  });
});
