import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LearnerHome } from '@/components/LearnerHome';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const authState = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState() }));

const addBonusXp = vi.fn();
vi.mock('@/contexts/ProgressContext', () => ({
  useProgressCtx: () => ({ progress: null, addBonusXp }),
}));

const todoListProps = vi.fn();
vi.mock('@/components/TodoList', () => ({
  TodoList: (props: { onXpEarned?: (xp: number) => void }) => {
    todoListProps(props);
    return <div data-testid="todo-list" />;
  },
}));

vi.mock('@/hooks/useDecks', () => ({ useDecks: () => ({ decks: [], loading: false }) }));
vi.mock('@/hooks/useAssignments', () => ({
  useAssignments: () => ({ assignments: [], loading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useGroupLeaderboards', () => ({ useGroupLeaderboards: () => ({ boards: [] }) }));
vi.mock('@/hooks/usePracticeChain', () => ({ useStartAssignmentQuest: () => vi.fn() }));
vi.mock('@/components/TodayAdventureCard', () => ({ TodayAdventureCard: () => null }));
vi.mock('@/components/Games', () => ({ GameTiles: () => null }));
vi.mock('@/components/LearnerHome/CollectionTeaser', () => ({ CollectionTeaser: () => null }));

const auth = (showTodo: boolean) => ({
  user: { email: 'naomi@kannanao.local' },
  displayName: 'Naomi',
  isInGroup: false,
  groupShowLeaderboard: false,
  showTodo,
});

describe('LearnerHome', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the to-do list to members and wires its XP to progress', () => {
    authState.mockReturnValue(auth(true));
    renderWithProviders(<LearnerHome />);
    expect(screen.getByTestId('todo-list')).toBeInTheDocument();
    expect(todoListProps).toHaveBeenCalledWith(expect.objectContaining({ onXpEarned: addBonusXp }));
  });

  it('hides the to-do list when the learner turned it off', () => {
    authState.mockReturnValue(auth(false));
    renderWithProviders(<LearnerHome />);
    expect(screen.queryByTestId('todo-list')).not.toBeInTheDocument();
  });
});
