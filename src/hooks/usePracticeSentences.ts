'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { invalidateApiCache } from '@/lib/apiCache';
import {
  deletePracticeSentences,
  fetchPracticeSentences,
  generatePracticeSentences,
  practiceSentencesCacheKey,
  updatePracticeSentences,
} from '@/services/api';
import { dbSentenceToApp, type PracticeSentence } from '@/types/practiceSentence';

export function usePracticeSentences(deckId: string, memberId?: string) {
  const t = useTranslations('Practice.usePracticeSentences');
  const [sentences, setSentences] = useState<PracticeSentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** True right after generate/regenerate completes — cleared by consumer */
  const [justGenerated, setJustGenerated] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPracticeSentences(deckId, memberId)
      .then((rows) => {
        if (!cancelled) setSentences(rows.map(dbSentenceToApp));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('failedToLoad'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deckId, memberId, t]);

  const invalidate = useCallback(
    () => invalidateApiCache(practiceSentencesCacheKey(deckId)),
    [deckId],
  );

  // Generate and regenerate always write the deck's shared set; `memberId` only
  // scopes the read above, so a legacy personalised set still displays.
  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const rows = await generatePracticeSentences(deckId);
      invalidate();
      if (mountedRef.current) {
        setSentences(rows.map(dbSentenceToApp));
        setJustGenerated(true);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : t('failedToGenerate'));
      }
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  }, [deckId, invalidate, t]);

  const regenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      await deletePracticeSentences(deckId);
      invalidate();
      const rows = await generatePracticeSentences(deckId);
      invalidate();
      if (mountedRef.current) {
        setSentences(rows.map(dbSentenceToApp));
        setJustGenerated(true);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : t('failedToRegenerate'));
      }
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  }, [deckId, invalidate, t]);

  const clearJustGenerated = useCallback(() => setJustGenerated(false), []);

  const updateSentences = useCallback(
    async (
      updates: { id: string; sentence_jp?: string; sentence_en?: string }[],
      deletes: string[],
    ) => {
      setSaving(true);
      setError(null);
      try {
        const rows = await updatePracticeSentences(deckId, updates, deletes);
        invalidate();
        if (mountedRef.current) setSentences(rows.map(dbSentenceToApp));
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : t('failedToSaveChanges'));
        }
        throw err;
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [deckId, invalidate, t],
  );

  return {
    sentences,
    loading,
    generating,
    saving,
    error,
    hasContent: sentences.length > 0,
    generate,
    regenerate,
    justGenerated,
    clearJustGenerated,
    updateSentences,
  };
}
