import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataError } from '@/lib/dataError';
import { renderWithProviders } from '@/test/renderWithProviders';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isMemberAccount: false, loading: false }),
}));

const refetchGroupsMock = vi.fn();
let groups: { id: string; name: string; emoji: string | null }[] = [
  { id: 'g1', name: 'Japanese 1', emoji: null },
];
let groupsError: DataError | null = null;
vi.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({
    groups,
    loading: false,
    error: groupsError,
    refetch: refetchGroupsMock,
  }),
}));

vi.mock('@/components/MaterialsBuilder/LessonSetBuilder', () => ({
  LessonSetBuilder: ({ hideGroupSelect }: { hideGroupSelect?: boolean }) => (
    <div>lesson-set-builder hideGroupSelect={String(hideGroupSelect)}</div>
  ),
}));
vi.mock('@/components/MaterialsBuilder/KanaCourseBuilder', () => ({
  KanaCourseBuilder: ({ hideGroupSelect }: { hideGroupSelect?: boolean }) => (
    <div>kana-course-builder hideGroupSelect={String(hideGroupSelect)}</div>
  ),
}));
vi.mock('@/components/MaterialsBuilder/QuizletImport', () => ({
  QuizletImport: ({ hideGroupSelect }: { hideGroupSelect?: boolean }) => (
    <div>quizlet-import hideGroupSelect={String(hideGroupSelect)}</div>
  ),
}));

type DeckDialogProps = {
  open: boolean;
  onClose: () => void;
  onDeckStarted?: (deckId: string) => void;
  onDeckCreated?: (deckId: string) => void;
};
vi.mock('@/components/CreateDeckDialog', () => ({
  CreateDeckDialog: ({ open, onClose, onDeckStarted, onDeckCreated }: DeckDialogProps) =>
    open ? (
      <div>
        create-deck-dialog
        <button onClick={onClose}>close</button>
        <button onClick={() => onDeckStarted?.('d1')}>start-deck</button>
        <button onClick={() => onDeckCreated?.('d1')}>finish-deck</button>
      </div>
    ) : null,
}));

import { AddMaterialPage } from '../AddMaterialPage';

describe('AddMaterialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groups = [{ id: 'g1', name: 'Japanese 1', emoji: null }];
    groupsError = null;
  });

  it('renders the lesson builder with the group select hidden', () => {
    renderWithProviders(<AddMaterialPage groupId="g1" source="lesson" />);
    expect(screen.getByText('lesson-set-builder hideGroupSelect=true')).toBeInTheDocument();
  });

  it('renders the kana builder with the group select hidden', () => {
    renderWithProviders(<AddMaterialPage groupId="g1" source="kana" />);
    expect(screen.getByText('kana-course-builder hideGroupSelect=true')).toBeInTheDocument();
  });

  it('renders the Quizlet importer with the group select hidden', () => {
    renderWithProviders(<AddMaterialPage groupId="g1" source="quizlet" />);
    expect(screen.getByText('quizlet-import hideGroupSelect=true')).toBeInTheDocument();
  });

  it('opens the create-deck dialog immediately for a blank deck', () => {
    renderWithProviders(<AddMaterialPage groupId="g1" source="blank" />);
    expect(screen.getByText('create-deck-dialog')).toBeInTheDocument();
  });

  it('back goes to the Plan tab', () => {
    renderWithProviders(<AddMaterialPage groupId="g1" source="lesson" />);
    screen.getByRole('button', { name: /back/i }).click();
    expect(pushMock).toHaveBeenCalledWith('/group/g1?tab=plan');
  });

  it('shows a retryable error instead of a builder when the groups fetch fails', () => {
    groupsError = new DataError('upstream', 'down');
    renderWithProviders(<AddMaterialPage groupId="g1" source="lesson" />);
    expect(screen.queryByText(/lesson-set-builder/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetchGroupsMock).toHaveBeenCalled();
  });

  it('shows a not-found state instead of a builder for a group the user cannot see', () => {
    groups = [];
    renderWithProviders(<AddMaterialPage groupId="g1" source="lesson" />);
    expect(screen.queryByText(/lesson-set-builder/)).not.toBeInTheDocument();
    expect(screen.getByText("Can't find that group")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to your groups/i }));
    expect(pushMock).toHaveBeenCalledWith('/group');
  });

  it('onDeckCreated pushes the assign URL', () => {
    renderWithProviders(<AddMaterialPage groupId="g1" source="blank" />);
    fireEvent.click(screen.getByText('finish-deck'));
    expect(pushMock).toHaveBeenCalledWith('/group/g1?tab=plan&assign=d1');
  });

  it('closing the dialog before any deck exists goes back to the Plan tab', () => {
    renderWithProviders(<AddMaterialPage groupId="g1" source="blank" />);
    fireEvent.click(screen.getByText('close'));
    expect(pushMock).toHaveBeenCalledWith('/group/g1?tab=plan');
  });

  it('closing the dialog alone, after a deck exists, does not navigate — it offers to hand it out', () => {
    renderWithProviders(<AddMaterialPage groupId="g1" source="blank" />);
    fireEvent.click(screen.getByText('start-deck'));
    pushMock.mockClear();
    fireEvent.click(screen.getByText('close'));
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByText(/saved to your decks/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /hand it out/i }));
    expect(pushMock).toHaveBeenCalledWith('/group/g1?tab=plan&assign=d1');
  });
});
