import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLoadLines = vi.fn();
const mockReorderLines = vi.fn();

vi.mock('@/lib/ohanashikai', () => ({
  loadOhanashikaiLines: (...args: unknown[]) => mockLoadLines(...args),
  dbCreateOhanashikaiLine: vi.fn(),
  dbUpdateOhanashikaiLine: vi.fn(),
  dbDeleteOhanashikaiLine: vi.fn(),
  dbImportOhanashikaiLines: vi.fn(),
  dbReorderOhanashikaiLines: (...args: unknown[]) => mockReorderLines(...args),
  loadOhanashikais: vi.fn().mockResolvedValue([]),
  dbCreateOhanashikai: vi.fn(),
  dbDeleteOhanashikai: vi.fn(),
  dbUpdateOhanashikaiTitle: vi.fn(),
  dbPinOhanashikai: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

import { useOhanashikaiLines } from '@/hooks/useOhanashikais';
import type { OhanashikaiLine } from '@/types/ohanashikai';

// ─── Test data ────────────────────────────────────────────────────────────────

function makeLine(overrides: Partial<OhanashikaiLine> = {}): OhanashikaiLine {
  return {
    id: 'line-1',
    ohanashikaiId: 'oh-1',
    text: 'こんにちは',
    orderIndex: 0,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useOhanashikaiLines — reorderLines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadLines.mockResolvedValue([]);
  });

  it('should optimistically update orderIndex for all lines', async () => {
    const lineA = makeLine({ id: 'a', text: 'A', orderIndex: 0 });
    const lineB = makeLine({ id: 'b', text: 'B', orderIndex: 1 });
    const lineC = makeLine({ id: 'c', text: 'C', orderIndex: 2 });
    mockLoadLines.mockResolvedValue([lineA, lineB, lineC]);
    mockReorderLines.mockResolvedValue(undefined);

    const { result } = renderHook(() => useOhanashikaiLines('oh-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Reorder: C, A, B
    await act(async () => {
      await result.current.reorderLines([lineC, lineA, lineB]);
    });

    expect(result.current.lines[0]).toMatchObject({ id: 'c', orderIndex: 0 });
    expect(result.current.lines[1]).toMatchObject({ id: 'a', orderIndex: 1 });
    expect(result.current.lines[2]).toMatchObject({ id: 'b', orderIndex: 2 });
  });

  it('should call dbReorderOhanashikaiLines with correct id/orderIndex pairs', async () => {
    const lineA = makeLine({ id: 'a', orderIndex: 0 });
    const lineB = makeLine({ id: 'b', orderIndex: 1 });
    mockLoadLines.mockResolvedValue([lineA, lineB]);
    mockReorderLines.mockResolvedValue(undefined);

    const { result } = renderHook(() => useOhanashikaiLines('oh-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.reorderLines([lineB, lineA]);
    });

    expect(mockReorderLines).toHaveBeenCalledWith([
      { id: 'b', orderIndex: 0 },
      { id: 'a', orderIndex: 1 },
    ]);
  });

  it('should roll back state when dbReorderOhanashikaiLines rejects', async () => {
    const lineA = makeLine({ id: 'a', text: 'A', orderIndex: 0 });
    const lineB = makeLine({ id: 'b', text: 'B', orderIndex: 1 });
    mockLoadLines.mockResolvedValue([lineA, lineB]);
    mockReorderLines.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useOhanashikaiLines('oh-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.reorderLines([lineB, lineA]);
    });

    // Should roll back to original order
    expect(result.current.lines[0]).toMatchObject({ id: 'a', orderIndex: 0 });
    expect(result.current.lines[1]).toMatchObject({ id: 'b', orderIndex: 1 });
  });
});
