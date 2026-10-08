'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { LESSON_LIBRARY_CACHE_PREFIX } from '@/hooks/useLessonLibrary';
import { invalidateApiCache } from '@/lib/apiCache';
import {
  enqueueQuizletHash,
  isReadyToSave,
  keptCards,
  loadQuizletQueue,
  mainViewModeFor,
  QUIZLET_QUEUE_KEY,
  type QuizletDraftCard,
  type QuizletImportSet,
  saveQuizletQueue,
} from '@/lib/quizlet';
import { dbCreateDeck, dbDeleteDeck, dbInsertCards, sb } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

export type { QuizletImportSet };

export interface SavedQuizletDeck {
  deckId: string;
  name: string;
  cardCount: number;
  assigned: boolean;
}

export interface AssignTarget {
  groupId: string;
  memberIds: string[];
}

async function assignDeck(deckId: string, target: AssignTarget): Promise<void> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch('/api/group/assignments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ memberIds: target.memberIds, deckId, groupId: target.groupId }),
  });
  if (!res.ok) throw new Error(`assign ${res.status}`);
}

async function saveOne(
  set: QuizletImportSet,
  target: AssignTarget | null,
  description: string,
): Promise<SavedQuizletDeck> {
  const cards = keptCards(set);
  const deck = await dbCreateDeck(set.name.trim() || 'Quizlet', description);
  const rows = cards.map(
    (c): Omit<Flashcard, 'id' | 'position'> => ({
      word: c.word.trim(),
      reading: c.reading.trim(),
      meaning: c.meaning.trim(),
      image_query: c.imageQuery,
      imageUrl: c.imageUrl ?? undefined,
      example_jp: c.exampleJp,
      example_en: c.exampleEn,
      deckId: deck.id,
      mainViewMode: mainViewModeFor(c.word, c.reading),
      cardType: c.cardType,
    }),
  );
  try {
    await dbInsertCards(deck.id, rows);
  } catch (err) {
    await dbDeleteDeck(deck.id).catch(() => undefined);
    throw err;
  }
  let assigned = false;
  if (target && target.memberIds.length > 0) {
    try {
      await assignDeck(deck.id, target);
      assigned = true;
    } catch {
      // The deck exists either way; the panel reports it as saved but unassigned.
    }
  }
  return { deckId: deck.id, name: deck.name, cardCount: cards.length, assigned };
}

export function useQuizletImport() {
  const t = useTranslations('Materials.quizlet');
  const [sets, setSets] = useState<QuizletImportSet[]>([]);
  const [saved, setSaved] = useState<SavedQuizletDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const takeHash = () => {
      const result = enqueueQuizletHash();
      if (result === 'invalid') setError(t('badLink'));
      return result;
    };
    takeHash();
    setSets(loadQuizletQueue());
    setLoading(false);

    const onHashChange = () => {
      if (takeHash() === 'ok') setSets(loadQuizletQueue());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === QUIZLET_QUEUE_KEY) setSets(loadQuizletQueue());
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [t]);

  useEffect(() => {
    if (!loading) saveQuizletQueue(sets);
  }, [sets, loading]);

  const updateSet = useCallback((url: string, patch: Partial<Omit<QuizletImportSet, 'url'>>) => {
    setSets((prev) => prev.map((s) => (s.url === url ? { ...s, ...patch } : s)));
  }, []);

  const updateCard = useCallback((url: string, index: number, patch: Partial<QuizletDraftCard>) => {
    setSets((prev) =>
      prev.map((s) =>
        s.url === url
          ? { ...s, cards: s.cards.map((c, i) => (i === index ? { ...c, ...patch } : c)) }
          : s,
      ),
    );
  }, []);

  const removeSet = useCallback((url: string) => {
    setSets((prev) => prev.filter((s) => s.url !== url));
  }, []);

  const saveAll = useCallback(
    async (target: AssignTarget | null) => {
      setSaving(true);
      setError(null);
      const toSave = sets.filter(isReadyToSave);
      const done: SavedQuizletDeck[] = [];
      try {
        for (const set of toSave) {
          done.push(await saveOne(set, target, t('deckDescription')));
          setSets((prev) => prev.filter((s) => s.url !== set.url));
        }
        if (done.some((d) => !d.assigned) && target?.memberIds.length) setError(t('assignFailed'));
      } catch {
        setError(t('saveFailed'));
      } finally {
        if (done.some((d) => d.assigned)) {
          invalidateApiCache('/api/group/assignments');
          invalidateApiCache(LESSON_LIBRARY_CACHE_PREFIX);
        }
        setSaved((prev) => [...prev, ...done]);
        setSaving(false);
      }
    },
    [sets, t],
  );

  return { sets, saved, loading, saving, error, updateSet, updateCard, removeSet, saveAll };
}
