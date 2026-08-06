import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpeakButton } from '@/components/SpeakButton';

const speak = vi.fn();
let speaking = false;

vi.mock('@/hooks/useSpeech', () => ({
  useSpeech: () => ({ speak, speaking }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('SpeakButton', () => {
  beforeEach(() => {
    speak.mockClear();
    speaking = false;
  });

  it('speaks the text on click', () => {
    render(<SpeakButton text="ねこ" />);
    fireEvent.click(screen.getByRole('button'));
    expect(speak).toHaveBeenCalledWith('ねこ');
  });

  it('calls onSpeak before playback', () => {
    const onSpeak = vi.fn();
    render(<SpeakButton text="いぬ" onSpeak={onSpeak} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSpeak).toHaveBeenCalled();
    expect(speak).toHaveBeenCalledWith('いぬ');
  });

  it('does not trigger a clickable parent', () => {
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick} role="presentation">
        <SpeakButton text="とり" />
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(speak).toHaveBeenCalled();
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('is disabled while speech is playing', () => {
    speaking = true;
    render(<SpeakButton text="うま" />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('accepts a callback sx without dropping it', () => {
    render(<SpeakButton text="さかな" sx={() => ({ opacity: 0.5 })} />);
    expect(screen.getByRole('button')).toHaveStyle({ opacity: '0.5' });
  });
});
