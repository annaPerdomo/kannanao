import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ScriptMatchDrill } from '../ScriptMatchDrill';
import { scriptMatchPairs } from '../scriptPairs';

const PAIRS = scriptMatchPairs(['ア', 'イ']);

function renderDrill(onAnswer = vi.fn(), onComplete = vi.fn()) {
  renderWithProviders(
    <ScriptMatchDrill pairs={PAIRS} onAnswer={onAnswer} onComplete={onComplete} />,
  );
  return onAnswer;
}

function tile(label: string) {
  return screen.getByRole('button', { name: label });
}

describe('ScriptMatchDrill', () => {
  it('records both characters of a resolved pair from one answer', () => {
    const onAnswer = renderDrill();

    fireEvent.click(tile('あ'));
    fireEvent.click(tile('ア'));

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(['あ', 'ア'], true);
  });

  // Blaming the clicked tile's partner instead would reset い and ア — two
  // characters the learner never touched — and leave あ/イ unscheduled.
  it('records the two characters actually tapped when wrong', () => {
    const onAnswer = renderDrill();

    fireEvent.click(tile('あ'));
    fireEvent.click(tile('イ'));

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(['あ', 'イ'], false);
  });

  it('does not grade a re-pick on the same side', () => {
    const onAnswer = renderDrill();

    fireEvent.click(tile('あ'));
    fireEvent.click(tile('い'));

    expect(onAnswer).not.toHaveBeenCalled();
  });

  // Hearing either tile would hand over the match.
  it('offers no read-aloud button', () => {
    renderDrill();

    expect(screen.queryByRole('button', { name: 'Read aloud' })).not.toBeInTheDocument();
  });
});
