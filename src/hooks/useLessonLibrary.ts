'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { todayIso } from '@/components/Group/dueDate';
import { fetchJsonCached, invalidateApiCache, peekApiCache } from '@/lib/apiCache';
import { shiftDate, weekStatus } from '@/lib/lessonUnits';
import { sb } from '@/lib/supabase';
import type { HandoutPatch, LessonLibrary, LessonUnitWeek } from '@/types/lessonUnit';

export const LESSON_LIBRARY_CACHE_PREFIX = '/api/group/lessons';
const ASSIGNMENTS_CACHE_PREFIX = '/api/group/assignments';

export type AddWeekResult = 'ok' | 'already_in_unit' | 'error';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function applyWeekPatch(
  library: LessonLibrary,
  deckId: string,
  apply: (week: LessonUnitWeek) => LessonUnitWeek,
): LessonLibrary {
  return {
    units: library.units.map((unit) => ({
      ...unit,
      weeks: unit.weeks.map((week) => (week.deckId === deckId ? apply(week) : week)),
    })),
    loose: library.loose.map((week) => (week.deckId === deckId ? apply(week) : week)),
  };
}

export function useLessonLibrary(groupId: string | null): {
  library: LessonLibrary | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  refetch: () => Promise<void>;
  editWeek: (deckId: string, patch: HandoutPatch) => Promise<boolean>;
  removeWeek: (deckId: string) => Promise<boolean>;
  renameUnit: (planId: string, title: string | null) => Promise<boolean>;
  shiftFrom: (planId: string, fromDeckId: string, days: number) => Promise<boolean>;
  addWeek: (
    planId: string,
    input: { kind: 'deck'; deckId: string } | { kind: 'review' },
  ) => Promise<AddWeekResult>;
} {
  const t = useTranslations('Materials.library');
  const url = groupId ? `${LESSON_LIBRARY_CACHE_PREFIX}?groupId=${groupId}` : null;
  // Mutated during render, not an effect: an in-flight action's background
  // refresh reads this to discard its result after the viewer switches groups.
  const urlRef = useRef(url);
  urlRef.current = url;
  const [library, setLibrary] = useState<LessonLibrary | null>(() =>
    url ? (peekApiCache<LessonLibrary>(url) ?? null) : null,
  );
  const [loading, setLoading] = useState(Boolean(url) && !library);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** setLibrary, but a no-op once `forUrl` is no longer the group on screen. */
  const setLibraryForUrl = useCallback(
    (
      forUrl: string,
      next: LessonLibrary | null | ((lib: LessonLibrary | null) => LessonLibrary | null),
    ) => {
      if (urlRef.current !== forUrl) return;
      setLibrary(next);
    },
    [],
  );

  const load = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!url) {
        setLibrary(null);
        setLoading(false);
        setError(null);
        return;
      }
      const cached = peekApiCache<LessonLibrary>(url);
      // No cache hit: clear the previous group's data instead of leaving it on screen.
      setLibrary(cached ?? null);
      setLoading(!cached);
      setError(null);
      try {
        const data = await fetchJsonCached<LessonLibrary>(url, authHeaders);
        if (!isCancelled()) setLibrary(data);
      } catch {
        if (!isCancelled()) setError(t('loadError'));
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [url, t],
  );

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(() => load(), [load]);

  /** Re-reads the library without touching `loading`, so UnitCards stay mounted (expand state) instead of collapsing. Best-effort. */
  const backgroundRefresh = useCallback(
    async (forUrl: string) => {
      invalidateApiCache(LESSON_LIBRARY_CACHE_PREFIX);
      invalidateApiCache(ASSIGNMENTS_CACHE_PREFIX);
      try {
        const data = await fetchJsonCached<LessonLibrary>(forUrl, authHeaders, { freshMs: 0 });
        setLibraryForUrl(forUrl, data);
      } catch {
        // Keep whatever optimistic/rolled-back state is already on screen.
      }
    },
    [setLibraryForUrl],
  );

  const editWeek = useCallback(
    async (deckId: string, patch: HandoutPatch) => {
      if (!url || !library) return false;
      const requestUrl = url;
      const prev = library;
      setLibraryForUrl(
        requestUrl,
        (lib) =>
          lib &&
          applyWeekPatch(lib, deckId, (week) => ({
            ...week,
            title: 'title' in patch ? (patch.title ?? null) : week.title,
            note: 'note' in patch ? (patch.note ?? null) : week.note,
            dueDate: 'dueDate' in patch ? (patch.dueDate ?? null) : week.dueDate,
            availableOn: 'availableOn' in patch ? (patch.availableOn ?? null) : week.availableOn,
            requiredAccuracy:
              'requiredAccuracy' in patch
                ? (patch.requiredAccuracy ?? null)
                : week.requiredAccuracy,
            requiredMode:
              'requiredMode' in patch ? (patch.requiredMode ?? null) : week.requiredMode,
          })),
      );
      setSaving(true);
      try {
        const res = await fetch('/api/group/lessons/handout', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({ groupId, deckId, ...patch }),
        });
        if (!res.ok) throw new Error();
        await backgroundRefresh(requestUrl);
        return true;
      } catch {
        setLibraryForUrl(requestUrl, prev);
        await backgroundRefresh(requestUrl);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [groupId, library, url, setLibraryForUrl, backgroundRefresh],
  );

  const removeWeek = useCallback(
    async (deckId: string) => {
      if (!url || !library || !groupId) return false;
      const requestUrl = url;
      const prev = library;
      setLibraryForUrl(requestUrl, (lib) =>
        lib
          ? {
              units: lib.units
                .map((unit) => ({
                  ...unit,
                  weeks: unit.weeks.filter((w) => w.deckId !== deckId),
                }))
                .filter((unit) => unit.weeks.length > 0),
              loose: lib.loose.filter((w) => w.deckId !== deckId),
            }
          : lib,
      );
      setSaving(true);
      try {
        const res = await fetch(
          `/api/group/lessons/handout?groupId=${encodeURIComponent(groupId)}&deckId=${encodeURIComponent(deckId)}`,
          { method: 'DELETE', headers: await authHeaders() },
        );
        if (!res.ok) throw new Error();
        await backgroundRefresh(requestUrl);
        return true;
      } catch {
        setLibraryForUrl(requestUrl, prev);
        await backgroundRefresh(requestUrl);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [groupId, library, url, setLibraryForUrl, backgroundRefresh],
  );

  const renameUnit = useCallback(
    async (planId: string, title: string | null) => {
      if (!url || !library) return false;
      const requestUrl = url;
      const prev = library;
      setLibraryForUrl(requestUrl, (lib) =>
        lib
          ? { ...lib, units: lib.units.map((u) => (u.id === planId ? { ...u, title } : u)) }
          : lib,
      );
      setSaving(true);
      try {
        const res = await fetch(`/api/group/lessons/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error();
        await backgroundRefresh(requestUrl);
        return true;
      } catch {
        setLibraryForUrl(requestUrl, prev);
        await backgroundRefresh(requestUrl);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [library, url, setLibraryForUrl, backgroundRefresh],
  );

  const shiftFrom = useCallback(
    async (planId: string, fromDeckId: string, days: number) => {
      if (!url || !library) return false;
      const requestUrl = url;
      const prev = library;
      const today = todayIso();
      setLibraryForUrl(requestUrl, (lib) => {
        if (!lib) return lib;
        return {
          ...lib,
          units: lib.units.map((unit) => {
            if (unit.id !== planId) return unit;
            let shifting = false;
            return {
              ...unit,
              weeks: unit.weeks.map((week) => {
                if (week.deckId === fromDeckId) shifting = true;
                if (!shifting) return week;
                const dueDate = shiftDate(week.dueDate, days);
                const availableOn = shiftDate(week.availableOn, days);
                return {
                  ...week,
                  dueDate,
                  availableOn,
                  status: weekStatus(availableOn, dueDate, today),
                };
              }),
            };
          }),
        };
      });
      setSaving(true);
      try {
        const res = await fetch(`/api/group/lessons/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({ shift: { fromDeckId, days } }),
        });
        if (!res.ok) throw new Error();
        await backgroundRefresh(requestUrl);
        return true;
      } catch {
        setLibraryForUrl(requestUrl, prev);
        await backgroundRefresh(requestUrl);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [library, url, setLibraryForUrl, backgroundRefresh],
  );

  /** Not optimistic — the server builds the new week's row — so this only refetches on success. */
  const addWeek = useCallback(
    async (
      planId: string,
      input: { kind: 'deck'; deckId: string } | { kind: 'review' },
    ): Promise<AddWeekResult> => {
      if (!url) return 'error';
      const requestUrl = url;
      setSaving(true);
      try {
        const res = await fetch(`/api/group/lessons/${planId}/weeks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify(input),
        });
        if (res.status === 409) {
          const body = await res.json().catch(() => null);
          await backgroundRefresh(requestUrl);
          // A position-collision conflict (23505 on the link insert) is distinct
          // from "that deck is already in a unit" and surfaces as a plain error.
          return body?.error === 'already_in_unit' ? 'already_in_unit' : 'error';
        }
        if (!res.ok) throw new Error();
        await backgroundRefresh(requestUrl);
        return 'ok';
      } catch {
        return 'error';
      } finally {
        setSaving(false);
      }
    },
    [url, backgroundRefresh],
  );

  return {
    library,
    loading,
    error,
    saving,
    refetch,
    editWeek,
    removeWeek,
    renameUnit,
    shiftFrom,
    addWeek,
  };
}
