import { isGoalMode } from '@/lib/assignmentMastery';
import type { HandoutPatch } from '@/types/lessonUnit';

import { memberIdsFor } from './membership';
import { type getServiceSupabase } from './serviceSupabase';

const TITLE_MAX = 200;
const NOTE_MAX = 500;
const PLAIN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Field rules extracted from `PATCH /api/group/assignments/[id]`, unchanged — that route now imports this instead of validating inline. */
export function parseHandoutPatch(body: unknown): { patch: HandoutPatch } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body.' };
  const b = body as Record<string, unknown>;
  const patch: HandoutPatch = {};

  if ('title' in b) {
    patch.title = typeof b.title === 'string' ? b.title.trim().slice(0, TITLE_MAX) || null : null;
  }
  if ('note' in b) {
    patch.note = typeof b.note === 'string' ? b.note.trim().slice(0, NOTE_MAX) || null : null;
  }
  if ('availableOn' in b) {
    const v = b.availableOn;
    if (v !== null && v !== '' && !PLAIN_DATE_RE.test(String(v))) {
      return { error: 'Invalid availableOn.' };
    }
    patch.availableOn = (v as string) || null;
  }
  if ('dueDate' in b) {
    const v = b.dueDate;
    if (v !== null && v !== undefined && (typeof v !== 'string' || Number.isNaN(Date.parse(v)))) {
      return { error: 'Invalid dueDate.' };
    }
    patch.dueDate = (v as string) || null;
  }
  if ('requiredAccuracy' in b) {
    const v = b.requiredAccuracy;
    if (v !== null && (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 100)) {
      return { error: 'requiredAccuracy must be an integer between 0 and 100.' };
    }
    patch.requiredAccuracy = v as number | null;
  }
  if ('requiredMode' in b) {
    const v = b.requiredMode;
    if (v !== null && !isGoalMode(v)) {
      return { error: 'requiredMode is not a valid goal mode.' };
    }
    patch.requiredMode = v as string | null;
  }

  return { patch };
}

/** Handout-route-only: `PATCH /api/group/assignments/[id]` never made this check and still doesn't. */
export function checkDateOrder(patch: HandoutPatch): { error: string } | null {
  if (patch.availableOn != null && patch.dueDate != null && patch.availableOn > patch.dueDate) {
    return { error: 'availableOn must be on or before dueDate.' };
  }
  return null;
}

export function handoutPatchToDbUpdates(patch: HandoutPatch): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if ('title' in patch) updates.title = patch.title;
  if ('note' in patch) updates.note = patch.note;
  if ('dueDate' in patch) updates.due_date = patch.dueDate;
  if ('availableOn' in patch) updates.available_on = patch.availableOn;
  if ('requiredAccuracy' in patch) updates.required_accuracy = patch.requiredAccuracy;
  if ('requiredMode' in patch) updates.required_mode = patch.requiredMode;
  return updates;
}

/** Writes both `assignments` and its `planned_assignments` template; never touches `completed_at` / `progress_accuracy`. */
export async function updateHandout(
  sb: ReturnType<typeof getServiceSupabase>,
  args: { organizerId: string; groupId: string; deckId: string; patch: HandoutPatch },
): Promise<{ error: string | null }> {
  const { organizerId, groupId, deckId, patch } = args;
  const updates = handoutPatchToDbUpdates(patch);
  if (Object.keys(updates).length === 0) return { error: null };

  const { error: assignmentsError } = await sb
    .from('assignments')
    .update(updates)
    .eq('organizer_id', organizerId)
    .eq('group_id', groupId)
    .eq('deck_id', deckId);
  if (assignmentsError) return { error: assignmentsError.message };

  const { error: templateError } = await sb
    .from('planned_assignments')
    .update(updates)
    .eq('organizer_id', organizerId)
    .eq('group_id', groupId)
    .eq('deck_id', deckId);
  if (templateError) return { error: templateError.message };

  return { error: null };
}

/** Row shape matches the apply route's assignDeck/savePlannedSchedule — one `assignments` row per learner plus the `planned_assignments` template. */
export async function assignHandout(
  sb: ReturnType<typeof getServiceSupabase>,
  args: {
    organizerId: string;
    groupId: string;
    deckId: string;
    title: string | null;
    note: string | null;
    dueDate: string | null;
    availableOn: string | null;
    requiredAccuracy: number | null;
    requiredMode: string | null;
  },
): Promise<{ error: string | null }> {
  const {
    organizerId,
    groupId,
    deckId,
    title,
    note,
    dueDate,
    availableOn,
    requiredAccuracy,
    requiredMode,
  } = args;

  const { error: templateError } = await sb.from('planned_assignments').upsert(
    {
      organizer_id: organizerId,
      group_id: groupId,
      deck_id: deckId,
      title,
      note,
      due_date: dueDate,
      available_on: availableOn,
      required_accuracy: requiredAccuracy,
      required_mode: requiredMode,
    },
    { onConflict: 'group_id,deck_id' },
  );
  if (templateError) return { error: templateError.message };

  const memberIds = await memberIdsFor({ organizerId, groupId });
  if (memberIds.length === 0) return { error: null };

  const rows = memberIds.map((memberId) => ({
    organizer_id: organizerId,
    group_id: groupId,
    member_id: memberId,
    deck_id: deckId,
    title,
    note,
    due_date: dueDate,
    available_on: availableOn,
    required_accuracy: requiredAccuracy,
    required_mode: requiredMode,
  }));

  const { error: assignmentsError } = await sb
    .from('assignments')
    .upsert(rows, { onConflict: 'member_id,deck_id,group_id' });
  if (assignmentsError) return { error: assignmentsError.message };

  return { error: null };
}

/** Deletes assignments, the template, and the plan-deck link; never the deck or its cards (they carry `card_progress`). */
export async function removeHandout(
  sb: ReturnType<typeof getServiceSupabase>,
  args: { organizerId: string; groupId: string; deckId: string },
): Promise<{ error: string | null }> {
  const { organizerId, groupId, deckId } = args;

  const { error: assignmentsError } = await sb
    .from('assignments')
    .delete()
    .eq('organizer_id', organizerId)
    .eq('group_id', groupId)
    .eq('deck_id', deckId);
  if (assignmentsError) return { error: assignmentsError.message };

  const { error: templateError } = await sb
    .from('planned_assignments')
    .delete()
    .eq('organizer_id', organizerId)
    .eq('group_id', groupId)
    .eq('deck_id', deckId);
  if (templateError) return { error: templateError.message };

  const { data: plans, error: plansError } = await sb
    .from('lesson_plans')
    .select('id')
    .eq('organizer_id', organizerId)
    .eq('group_id', groupId);
  if (plansError) return { error: plansError.message };

  const planIds = ((plans ?? []) as { id: string }[]).map((p) => p.id);
  if (planIds.length > 0) {
    const { error: planDeckError } = await sb
      .from('lesson_plan_decks')
      .delete()
      .eq('deck_id', deckId)
      .in('plan_id', planIds);
    if (planDeckError) return { error: planDeckError.message };
  }

  return { error: null };
}
