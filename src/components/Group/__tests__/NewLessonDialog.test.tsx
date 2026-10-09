import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonUnit } from '@/types/lessonUnit';

const mockCreateLesson = vi.fn();
vi.mock('@/services/api', () => ({
  createLesson: (...args: unknown[]) => mockCreateLesson(...args),
  handOutLesson: vi.fn(),
  updateLessonKana: vi.fn(),
}));

vi.mock('@/lib/apiCache', () => ({ invalidateApiCache: vi.fn() }));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

import { NewLessonDialog } from '../NewLessonDialog';

function units(): LessonUnit[] {
  return [{ id: 'u1', title: 'Unit 1', level: null, createdAt: '2026-01-01T00:00:00Z', weeks: [] }];
}

describe('NewLessonDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a lesson into an existing unit and navigates to the handout page', async () => {
    mockCreateLesson.mockResolvedValue({ planId: 'u1', deckId: 'd1' });
    const onClose = vi.fn();
    renderWithProviders(<NewLessonDialog open onClose={onClose} groupId="g1" units={units()} />);

    fireEvent.change(screen.getByPlaceholderText('Week 3 — At the restaurant'), {
      target: { value: 'Week 3 — At the restaurant' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create lesson' }));

    await vi.waitFor(() =>
      expect(mockCreateLesson).toHaveBeenCalledWith({
        groupId: 'g1',
        title: 'Week 3 — At the restaurant',
        unit: { planId: 'u1' },
      }),
    );
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith('/group/g1/handout/d1');
  });

  it('"New unit…" reveals a unit-title field and creates with that title', async () => {
    mockCreateLesson.mockResolvedValue({ planId: 'u2', deckId: 'd2' });
    renderWithProviders(<NewLessonDialog open onClose={vi.fn()} groupId="g1" units={[]} />);

    fireEvent.change(screen.getByPlaceholderText('Week 3 — At the restaurant'), {
      target: { value: 'Week 1' },
    });
    fireEvent.change(screen.getByLabelText('Unit name'), { target: { value: 'Spring unit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create lesson' }));

    await vi.waitFor(() =>
      expect(mockCreateLesson).toHaveBeenCalledWith({
        groupId: 'g1',
        title: 'Week 1',
        unit: { title: 'Spring unit' },
      }),
    );
  });

  it('shows the error and does not navigate on failure', async () => {
    mockCreateLesson.mockRejectedValue(new Error('Failed to create the lesson.'));
    renderWithProviders(<NewLessonDialog open onClose={vi.fn()} groupId="g1" units={[]} />);

    fireEvent.change(screen.getByPlaceholderText('Week 3 — At the restaurant'), {
      target: { value: 'Week 1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create lesson' }));

    expect(await screen.findByText('Failed to create the lesson.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('picks up a unit that loads in after the dialog is already open', async () => {
    mockCreateLesson.mockResolvedValue({ planId: 'u1', deckId: 'd1' });
    const { rerender } = renderWithProviders(
      <NewLessonDialog open onClose={vi.fn()} groupId="g1" units={[]} />,
    );

    rerender(<NewLessonDialog open onClose={vi.fn()} groupId="g1" units={units()} />);

    fireEvent.change(screen.getByPlaceholderText('Week 3 — At the restaurant'), {
      target: { value: 'Week 1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create lesson' }));

    await vi.waitFor(() =>
      expect(mockCreateLesson).toHaveBeenCalledWith({
        groupId: 'g1',
        title: 'Week 1',
        unit: { planId: 'u1' },
      }),
    );
  });

  it('lets the user pick "New unit…" even when a unit already exists', async () => {
    mockCreateLesson.mockResolvedValue({ planId: 'u2', deckId: 'd2' });
    renderWithProviders(<NewLessonDialog open onClose={vi.fn()} groupId="g1" units={units()} />);

    fireEvent.change(screen.getByPlaceholderText('Week 3 — At the restaurant'), {
      target: { value: 'Week 1' },
    });
    fireEvent.mouseDown(screen.getByLabelText('Unit'));
    fireEvent.click(screen.getByText('New unit…'));
    fireEvent.change(screen.getByLabelText('Unit name'), { target: { value: 'Spring unit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create lesson' }));

    await vi.waitFor(() =>
      expect(mockCreateLesson).toHaveBeenCalledWith({
        groupId: 'g1',
        title: 'Week 1',
        unit: { title: 'Spring unit' },
      }),
    );
  });

  it('disables the create button while saving and when the title is empty', () => {
    renderWithProviders(<NewLessonDialog open onClose={vi.fn()} groupId="g1" units={[]} />);
    expect(screen.getByRole('button', { name: 'Create lesson' })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Week 3 — At the restaurant'), {
      target: { value: 'Week 1' },
    });
    expect(screen.getByRole('button', { name: 'Create lesson' })).not.toBeDisabled();
  });
});
