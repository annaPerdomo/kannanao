'use client';
import { useCallback, useState } from 'react';

import { invalidateApiCache } from '@/lib/apiCache';
import { createLesson, handOutLesson, updateLessonKana } from '@/services/api';
import type {
  CreateLessonResult,
  HandOutLessonPayload,
  HandOutLessonResult,
} from '@/types/lessonUnit';

import { ASSIGNMENTS_CACHE_PREFIX, LESSON_LIBRARY_CACHE_PREFIX } from './useLessonLibrary';

export interface UseLessonEditsResult {
  saving: boolean;
  error: string | null;
  clearError: () => void;
  createLesson: (args: {
    title: string;
    unit: { planId: string } | { title: string | null };
    kanaSets?: string[];
  }) => Promise<CreateLessonResult | null>;
  handOut: (args: Omit<HandOutLessonPayload, 'groupId'>) => Promise<HandOutLessonResult | null>;
  setKanaSets: (deckId: string, kanaSets: string[]) => Promise<boolean>;
}

export function useLessonEdits(groupId: string): UseLessonEditsResult {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const create = useCallback(
    async (args: {
      title: string;
      unit: { planId: string } | { title: string | null };
      kanaSets?: string[];
    }) => {
      setSaving(true);
      setError(null);
      try {
        const result = await createLesson({ groupId, ...args });
        invalidateApiCache(LESSON_LIBRARY_CACHE_PREFIX);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create the lesson.');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [groupId],
  );

  const handOut = useCallback(
    async (args: Omit<HandOutLessonPayload, 'groupId'>) => {
      setSaving(true);
      setError(null);
      try {
        const result = await handOutLesson({ groupId, ...args });
        invalidateApiCache(LESSON_LIBRARY_CACHE_PREFIX);
        invalidateApiCache(ASSIGNMENTS_CACHE_PREFIX);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to hand out the lesson.');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [groupId],
  );

  const setKanaSets = useCallback(
    async (deckId: string, kanaSets: string[]) => {
      setSaving(true);
      setError(null);
      try {
        await updateLessonKana({ groupId, deckId, kanaSets });
        invalidateApiCache(LESSON_LIBRARY_CACHE_PREFIX);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update sound rows.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [groupId],
  );

  return { saving, error, clearError, createLesson: create, handOut, setKanaSets };
}
