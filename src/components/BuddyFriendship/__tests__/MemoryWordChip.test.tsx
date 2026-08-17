import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemoryWordChip } from '@/components/BuddyFriendship/MemoryWordChip';
import { renderWithProviders as render } from '@/test/renderWithProviders';

const speak = vi.fn();
vi.mock('@/hooks/useSpeech', () => ({
  useSpeech: () => ({ speak, speaking: false }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('MemoryWordChip', () => {
  beforeEach(() => {
    speak.mockClear();
  });

  it('rubies the kanji from the authored reading', () => {
    const { container } = render(
      <MemoryWordChip word={{ jp: 'お弁当', reading: 'おべんとう', en: 'lunchbox' }} />,
    );

    expect(container.querySelector('rt')?.textContent).toBe('べんとう');
    expect(screen.getByText('lunchbox')).toBeInTheDocument();
  });

  it('reads the word aloud in kana, never the mixed-script word', () => {
    render(<MemoryWordChip word={{ jp: 'お弁当', reading: 'おべんとう', en: 'lunchbox' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'readAloud' }));

    expect(speak).toHaveBeenCalledWith('おべんとう');
  });

  it('shows a kana word plainly, with no ruby to add', () => {
    const { container } = render(
      <MemoryWordChip word={{ jp: 'ねこ', reading: 'ねこ', en: 'cat' }} />,
    );

    expect(container.querySelector('rt')).toBeNull();
    expect(screen.getByText('ねこ')).toBeInTheDocument();
  });

  it('renders a word with no gloss authored yet', () => {
    render(<MemoryWordChip word={{ jp: 'ねこ', reading: '', en: '' }} />);

    expect(screen.getByText('ねこ')).toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });
});
