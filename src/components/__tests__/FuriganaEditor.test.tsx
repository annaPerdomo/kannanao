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

import { formatFurigana } from '@/services/api';

describe('FuriganaEditor', () => {
  it('renders one reading input per kanji group with the current readings', () => {
    renderWithProviders(<FuriganaEditor value="{私|わたし}は{話|はな}す" onChange={vi.fn()} />);

    expect(screen.getByDisplayValue('わたし')).toBeInTheDocument();
    expect(screen.getByDisplayValue('はな')).toBeInTheDocument();
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

  it('auto-fill button calls formatFurigana and passes the result to onChange', async () => {
    const onChange = vi.fn();
    vi.mocked(formatFurigana).mockResolvedValue(['{私|わたし}は{話|はな}す']);
    renderWithProviders(<FuriganaEditor value="私は話す" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Fill in readings' }));

    await screen.findByRole('button', { name: 'Fill in readings' });
    expect(formatFurigana).toHaveBeenCalledWith(['私は話す']);
    expect(onChange).toHaveBeenCalledWith('{私|わたし}は{話|はな}す');
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
