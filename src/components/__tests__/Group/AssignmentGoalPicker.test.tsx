import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AssignmentGoalPicker } from '@/components/Group/AssignmentGoalPicker';
import type { GoalMode } from '@/lib/assignmentMastery';
import { renderWithProviders } from '@/test/renderWithProviders';

function Harness({
  onAccuracyChange = vi.fn(),
  onModeChange = vi.fn(),
  unavailableModes,
}: {
  onAccuracyChange?: (v: number | null) => void;
  onModeChange?: (v: GoalMode | null) => void;
  unavailableModes?: readonly GoalMode[];
}) {
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [mode, setMode] = useState<GoalMode | null>(null);
  return (
    <AssignmentGoalPicker
      accuracy={accuracy}
      mode={mode}
      unavailableModes={unavailableModes}
      onAccuracyChange={(v) => {
        setAccuracy(v);
        onAccuracyChange(v);
      }}
      onModeChange={(v) => {
        setMode(v);
        onModeChange(v);
      }}
    />
  );
}

describe('AssignmentGoalPicker', () => {
  it('starts collapsed with the goal options hidden', () => {
    renderWithProviders(<Harness />);
    const toggle = screen.getByRole('button', { name: /add a goal/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands on click and shows accuracy + mode chips', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /add a goal/i }));
    expect(screen.getByRole('button', { name: /add a goal/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: '80%' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Match' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sentence Builder' })).toBeInTheDocument();
  });

  it('offers Reading when the deck has unlocked it', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /add a goal/i }));
    expect(screen.getByRole('button', { name: 'Reading' })).toBeInTheDocument();
  });

  it('hides a goal mode the chosen deck cannot answer', () => {
    renderWithProviders(<Harness unavailableModes={['reading']} />);
    fireEvent.click(screen.getByRole('button', { name: /add a goal/i }));
    expect(screen.queryByRole('button', { name: 'Reading' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Match' })).toBeInTheDocument();
  });

  it('reports accuracy chip selection', () => {
    const onAccuracyChange = vi.fn();
    renderWithProviders(<Harness onAccuracyChange={onAccuracyChange} />);
    fireEvent.click(screen.getByRole('button', { name: /add a goal/i }));
    fireEvent.click(screen.getByRole('button', { name: '80%' }));
    expect(onAccuracyChange).toHaveBeenCalledWith(80);
    expect(screen.getByRole('button', { name: '80%' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports mode chip selection and can clear back to Any', () => {
    const onModeChange = vi.fn();
    renderWithProviders(<Harness onModeChange={onModeChange} />);
    fireEvent.click(screen.getByRole('button', { name: /add a goal/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Match' }));
    expect(onModeChange).toHaveBeenCalledWith('match');
    fireEvent.click(screen.getByRole('button', { name: 'Any' }));
    expect(onModeChange).toHaveBeenCalledWith(null);
  });

  it('supports keyboard activation on the disclosure and chips', () => {
    const onAccuracyChange = vi.fn();
    renderWithProviders(<Harness onAccuracyChange={onAccuracyChange} />);
    fireEvent.keyDown(screen.getByRole('button', { name: /add a goal/i }), { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('button', { name: '90%' }), { key: ' ' });
    expect(onAccuracyChange).toHaveBeenCalledWith(90);
  });
});
