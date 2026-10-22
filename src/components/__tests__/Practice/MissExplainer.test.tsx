import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

vi.mock('@/components/SpeakButton', () => ({
  SpeakButton: ({ text }: { text: string }) => (
    <button type="button" aria-label="read aloud" data-speak-text={text} />
  ),
}));

import { MissExplainer } from '@/components/Practice/MissExplainer';

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'c1',
    deckId: 'deck-1',
    word: 'たかいです (Negative)',
    reading: '',
    meaning: 'たか くないです (drop い add くない)',
    image_query: '',
    example_jp: '{父|ちち}の{車|くるま}はあまりたかくないです。',
    example_en: "My father's car isn't very expensive.",
    mainViewMode: 'hiragana',
    cardType: 'word',
    jlptLevel: 'N5',
    position: 0,
    ...overrides,
  };
}

describe('MissExplainer', () => {
  it('renders the word, meaning, sentence and translation', () => {
    const card = makeCard();
    renderWithProviders(<MissExplainer card={card} onContinue={vi.fn()} />);

    expect(screen.getByText(card.word)).toBeInTheDocument();
    expect(screen.getByText(card.meaning)).toBeInTheDocument();
    expect(screen.getByText("My father's car isn't very expensive.")).toBeInTheDocument();
  });

  it('hides the sentence block when example_jp is empty', () => {
    const card = makeCard({ example_jp: '', example_en: '' });
    renderWithProviders(<MissExplainer card={card} onContinue={vi.fn()} />);

    expect(screen.queryByText("My father's car isn't very expensive.")).not.toBeInTheDocument();
  });

  it('renders the rule line when passed', () => {
    const card = makeCard();
    renderWithProviders(
      <MissExplainer card={card} rule="Drop い, add くない" onContinue={vi.fn()} />,
    );

    expect(screen.getByText('Drop い, add くない')).toBeInTheDocument();
  });

  it('calls onContinue when "Got it" is clicked', () => {
    const card = makeCard();
    const onContinue = vi.fn();
    renderWithProviders(<MissExplainer card={card} onContinue={onContinue} />);

    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('offers a speak button for the word, even without an example sentence', () => {
    const card = makeCard({ example_jp: '', example_en: '' });
    renderWithProviders(<MissExplainer card={card} onContinue={vi.fn()} />);

    const speakers = screen.getAllByLabelText('read aloud');
    expect(speakers).toHaveLength(1);
    expect(speakers[0]).toHaveAttribute('data-speak-text', card.word);
  });

  it('shows the card image when imageUrl is passed', () => {
    const card = makeCard();
    renderWithProviders(
      <MissExplainer card={card} imageUrl="https://images.test/card.jpg" onContinue={vi.fn()} />,
    );

    const img = screen.getByRole('img', { name: card.word });
    expect(img).toHaveAttribute('src', 'https://images.test/card.jpg');
  });

  it('omits the image when no imageUrl is passed', () => {
    const card = makeCard();
    renderWithProviders(<MissExplainer card={card} onContinue={vi.fn()} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('exposes the panel as a labelled region', () => {
    const card = makeCard();
    renderWithProviders(<MissExplainer card={card} onContinue={vi.fn()} />);

    const region = screen.getByRole('region');
    expect(region).toHaveAccessibleName("Let's look again");
  });

  it('ignores a key-repeat on "Got it" so holding Enter does not re-fire it', () => {
    const card = makeCard();
    renderWithProviders(<MissExplainer card={card} onContinue={vi.fn()} />);

    const gotIt = screen.getByRole('button', { name: 'Got it' });
    const repeated = fireEvent.keyDown(gotIt, { key: 'Enter', repeat: true });
    expect(repeated).toBe(false);

    const first = fireEvent.keyDown(gotIt, { key: 'Enter', repeat: false });
    expect(first).toBe(true);
  });
});
