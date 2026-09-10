import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReadingCell } from '@/components/Group/LearnersTable/ReadingCell';
import type { GroupMember } from '@/hooks/useGroup';
import { renderWithProviders } from '@/test/renderWithProviders';

function member(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    id: 'm1',
    username: 'user1',
    displayName: null,
    avatar: null,
    createdAt: '2026-01-01T00:00:00Z',
    level: 1,
    totalXp: 0,
    streakDays: 0,
    totalCardsStudied: 0,
    totalCorrect: 0,
    totalSessions: 0,
    lastActive: null,
    lastNudgedAt: null,
    masteryLearning: 0,
    masteryStrong: 0,
    reviewsWaiting: 0,
    reviewsOverdue3d: 0,
    ...overrides,
  };
}

describe('ReadingCell', () => {
  it('renders a dash when there is no reading label', () => {
    renderWithProviders(<ReadingCell member={member()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the known-character counts alongside the label', () => {
    renderWithProviders(
      <ReadingCell
        member={member({
          hiragana: 'reads',
          katakana: 'learning',
          hiraganaKnown: 46,
          katakanaKnown: 12,
        })}
      />,
    );
    expect(screen.getByText('Learning katakana')).toBeInTheDocument();
    expect(screen.getByText('あ 46 · ア 12')).toBeInTheDocument();
  });
});
