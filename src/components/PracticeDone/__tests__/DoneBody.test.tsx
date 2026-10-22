import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DoneBody } from '@/components/PracticeDone/DoneBody';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('DoneBody', () => {
  it('offers the bonus round with its reward chips when words are due and rounds remain', () => {
    const onBonus = vi.fn();
    renderWithProviders(
      <DoneBody
        buddyName="Tsuki"
        faceSrc="/buddies/tsuki.webp"
        dueCount={12}
        offerBonus
        showBonusHearts
        onBonus={onBonus}
        onMorePractice={vi.fn()}
        onFinish={vi.fn()}
      />,
    );

    expect(screen.getByText('12 words are still waiting to be reviewed.')).toBeInTheDocument();
    expect(screen.getByText('+2 ❤️ for Tsuki')).toBeInTheDocument();
    expect(screen.getByText('+50 XP')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bonus round' }));
    expect(onBonus).toHaveBeenCalled();
  });

  it('hides the hearts chip once the bonus source has already paid today', () => {
    renderWithProviders(
      <DoneBody
        buddyName="Tsuki"
        faceSrc="/buddies/tsuki.webp"
        dueCount={12}
        offerBonus
        showBonusHearts={false}
        onBonus={vi.fn()}
        onMorePractice={vi.fn()}
        onFinish={vi.fn()}
      />,
    );

    expect(screen.queryByText(/❤️/)).toBeNull();
    expect(screen.getByText('+50 XP')).toBeInTheDocument();
  });

  it('shows the all-caught-up state and a plain practice button once rounds are exhausted or nothing is due', () => {
    const onMorePractice = vi.fn();
    renderWithProviders(
      <DoneBody
        buddyName="Tsuki"
        faceSrc="/buddies/tsuki.webp"
        dueCount={0}
        offerBonus={false}
        showBonusHearts={false}
        onBonus={vi.fn()}
        onMorePractice={onMorePractice}
        onFinish={vi.fn()}
      />,
    );

    expect(screen.getByText('All caught up — nothing waiting!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Practice my lesson words' }));
    expect(onMorePractice).toHaveBeenCalled();
  });

  it('always offers a way to finish', () => {
    const onFinish = vi.fn();
    renderWithProviders(
      <DoneBody
        buddyName="Tsuki"
        faceSrc="/buddies/tsuki.webp"
        dueCount={0}
        offerBonus={false}
        showBonusHearts={false}
        onBonus={vi.fn()}
        onMorePractice={vi.fn()}
        onFinish={onFinish}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onFinish).toHaveBeenCalled();
  });
});
