import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataError } from '@/lib/dataError';
import { renderWithProviders } from '@/test/renderWithProviders';

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

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

  it('redirects a blank deck to the Lessons tab with the new-lesson dialog open', () => {
    renderWithProviders(<AddMaterialPage groupId="g1" source="blank" />);
    expect(replaceMock).toHaveBeenCalledWith('/group/g1?tab=lessons&new=1');
  });

  it('back goes to the Lessons tab', () => {
    renderWithProviders(<AddMaterialPage groupId="g1" source="lesson" />);
    screen.getByRole('button', { name: /back/i }).click();
    expect(pushMock).toHaveBeenCalledWith('/group/g1?tab=lessons');
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
});
