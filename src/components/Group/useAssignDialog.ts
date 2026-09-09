'use client';
import { useCallback, useState } from 'react';

import type { AssignmentBatch } from './AssignmentsList/groupAssignments';
import { daysUntilDue } from './dueDate';

export interface AssignPresetFields {
  note?: string;
  dueDate?: string;
  requiredAccuracy?: number;
  requiredMode?: string;
}

export interface AssignPreset {
  deckId?: string;
  kanaSet?: string;
  memberIds?: string[];
  fields?: AssignPresetFields;
}

/** A deadline already behind us would hand the late learners an instantly overdue copy. */
function presetFields(batch: AssignmentBatch): AssignPresetFields {
  const { note, due_date, required_accuracy, required_mode } = batch.sample;
  return {
    note: note ?? undefined,
    dueDate: due_date && daysUntilDue(due_date) >= 0 ? due_date.slice(0, 10) : undefined,
    requiredAccuracy: required_accuracy ?? undefined,
    requiredMode: required_mode ?? undefined,
  };
}

// `session` bumps on every open so the dialog remounts with fresh props
// instead of carrying a cancelled preset into the next handout.
export function useAssignDialog() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<AssignPreset | null>(null);
  const [session, setSession] = useState(0);

  const openAssign = useCallback((next?: AssignPreset) => {
    setPreset(next ?? null);
    setSession((n) => n + 1);
    setOpen(true);
  }, []);

  const closeAssign = useCallback(() => {
    setOpen(false);
    setPreset(null);
  }, []);

  const assignMissing = useCallback(
    (batch: AssignmentBatch, memberIds: string[]) => {
      openAssign({
        deckId: batch.sample.kana_set ? undefined : (batch.sample.deck_id ?? undefined),
        kanaSet: batch.sample.kana_set ?? undefined,
        memberIds,
        fields: presetFields(batch),
      });
    },
    [openAssign],
  );

  return { open, preset, session, openAssign, closeAssign, assignMissing };
}

export type AssignDialogState = ReturnType<typeof useAssignDialog>;
