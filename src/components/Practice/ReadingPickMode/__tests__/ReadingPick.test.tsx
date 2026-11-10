import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Flashcard } from '@/types/flashcard';

import { PickPrompt } from '../PickPrompt';
import { eligiblePickCards, pickQuestion } from '../questions';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values ? `${key}:${Object.values(values).join(',')}` : key,
}));

vi.mock('../../ChoiceGrid', () => ({
  ChoiceGrid: ({ choices, onSelect }: { choices: string[]; onSelect: (c: string) => void }) => (
    <div>
      {choices.map((choice) => (
        <button key={choice} onClick={() => onSelect(choice)}>
          {choice}
        </button>
      ))}
    </div>
  ),
}));

const card = (word: string, reading: string): Flashcard =>
  ({
    id: word,
    word,
    reading,
    meaning: `${word} meaning`,
    example_jp: '',
    example_en: '',
  }) as Flashcard;

describe('pickQuestion', () => {
  it('offers three whole readings with the right one among them', () => {
    const question = pickQuestion(card('4月', 'しがつ'), 1)!;
    expect(question.choices).toHaveLength(3);
    expect(question.choices).toContain('しがつ');
    expect(question.answer).toBe('しがつ');
    expect(question.weekday).toBeNull();
  });

  it('flags a day of the week for the calendar picture', () => {
    expect(pickQuestion(card('木よう日', 'もくようび'), 1)?.weekday).toBe(4);
  });

  it('sits out kana-only words and readings it cannot alter', () => {
    expect(pickQuestion(card('ねこ', 'ねこ'), 1)).toBeNull();
    expect(
      eligiblePickCards([card('ねこ', 'ねこ'), card('水', 'みず'), card('珈琲', 'コーヒー')]).map(
        (c) => c.word,
      ),
    ).toEqual(['水']);
  });
});

describe('PickPrompt', () => {
  it('shows the word and reports the tapped reading', () => {
    const question = pickQuestion(card('水', 'みず'), 1)!;
    const onSelect = vi.fn();
    render(
      <PickPrompt
        card={card('水', 'みず')}
        question={question}
        selected={null}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('水')).toBeInTheDocument();
    expect(screen.queryByText('水 meaning')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('みず'));
    expect(onSelect).toHaveBeenCalledWith('みず');
  });

  it('swaps the word for a calendar when it is a weekday, and reveals the meaning after', () => {
    const day = card('火曜日', 'かようび');
    render(
      <PickPrompt
        card={day}
        question={pickQuestion(day, 1)!}
        selected="かようび"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('img', { name: 'calendarAria:火曜日' })).toBeInTheDocument();
    expect(screen.queryByText('火曜日')).not.toBeInTheDocument();
    expect(screen.getByText('火曜日 meaning')).toBeInTheDocument();
  });
});
