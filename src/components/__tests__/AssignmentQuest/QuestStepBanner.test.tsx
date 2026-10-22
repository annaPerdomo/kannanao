import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QuestStepBanner } from '@/components/AssignmentQuest';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('QuestStepBanner', () => {
  it('shows the game emoji and name for a daily/mixed chain', () => {
    renderWithProviders(
      <QuestStepBanner
        kind="daily"
        currentIndex={1}
        legs={[
          { step: 'review', mode: 'review' },
          { step: 'practice', mode: 'kotoba-bubble' },
        ]}
      />,
    );
    expect(screen.getByText('🫧')).toBeInTheDocument();
    expect(screen.getByText(/Sentence Builder/)).toBeInTheDocument();
  });

  it('shows the step emoji and role name for an assignment quest', () => {
    renderWithProviders(
      <QuestStepBanner
        kind="assignment"
        currentIndex={0}
        legs={[
          { step: 'warmup', mode: 'study' },
          { step: 'goal', mode: 'kotoba-bubble' },
        ]}
      />,
    );
    expect(screen.getByText('🔖')).toBeInTheDocument();
    expect(screen.getByText(/Warm up/)).toBeInTheDocument();
  });

  it('renders nothing for an index past the end of the legs', () => {
    const { container } = renderWithProviders(
      <QuestStepBanner kind="daily" currentIndex={5} legs={[{ step: 'review', mode: 'review' }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
