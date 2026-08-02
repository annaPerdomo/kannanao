'use client';
import { useCallback, useMemo, useState } from 'react';

import {
  encodeUnsplashUrl,
  fetchImagesBatch,
  IMAGE_BATCH_SIZE,
  type ImageBatchItem,
} from '@/services/api';
import type { Flashcard } from '@/types/flashcard';

/**
 * What Unsplash should be asked for. The generator's English `image_query` is
 * the best search term; the meaning is the fallback. The word itself is never
 * used — it's Japanese, and Unsplash searches it badly.
 */
export function imageQueryFor(card: Flashcard): string {
  return card.image_query?.trim() || card.meaning?.trim() || '';
}

export interface FillImagesResult {
  added: number;
  /** True when Unsplash's hourly allowance ran out before the deck was done. */
  rateLimited: boolean;
  /** Cards the run never got to because it ended on a fault. */
  missed: number;
}

/**
 * Fetches pictures for the cards the owner ticked. Cards with no picture start
 * ticked, since that's the common case — Unsplash's hourly allowance runs out
 * mid-generation and leaves a few cards bare. Ticking a card that already has a
 * picture replaces it, which is how a bad photo gets a second try.
 */
export function useDeckImages(
  cards: Flashcard[],
  updateCard: (id: string, patch: Partial<Flashcard>) => Promise<Flashcard | null>,
  /**
   * Called with the freshly pictured cards once a run finds at least one, so
   * the owner of the flow can offer a look before the pictures are settled on.
   * They carry the new `imageUrl` already — reading it back off deck state
   * would race the last save.
   */
  onFilled?: (filled: Flashcard[]) => void,
) {
  const [filling, setFilling] = useState(false);
  const [result, setResult] = useState<FillImagesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickable = useMemo(() => cards.filter((c) => imageQueryFor(c)), [cards]);
  const missingIds = useMemo(
    () => pickable.filter((c) => !c.imageUrl).map((c) => c.id),
    [pickable],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(missingIds));

  // Ids are filtered through the deck rather than trusted, so a card deleted
  // while the dialog was open can't be searched for or counted.
  const selected = useMemo(
    () => pickable.filter((c) => selectedIds.has(c.id)),
    [pickable, selectedIds],
  );

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(pickable.map((c) => c.id)));
  }, [pickable]);

  const selectNone = useCallback(() => setSelectedIds(new Set()), []);

  const fetchSelectedImages = useCallback(async () => {
    if (filling || selected.length === 0) return;

    setFilling(true);
    setError(null);
    setResult(null);

    const filled: Flashcard[] = [];
    let done = 0;
    let rateLimited = false;
    let stopped = false;
    let failure: string | null = null;

    try {
      for (let i = 0; i < selected.length; i += IMAGE_BATCH_SIZE) {
        const chunk = selected.slice(i, i + IMAGE_BATCH_SIZE);

        const items = new Map<string, ImageBatchItem>();
        for (const card of chunk) {
          const query = imageQueryFor(card);
          const item = items.get(query);
          if (item) item.variety = item.variety || !!card.imageUrl;
          else items.set(query, { query, variety: !!card.imageUrl });
        }

        const batch = await fetchImagesBatch([...items.values()]);
        const byQuery = new Map(batch.results.map((r) => [r.query, r.result]));

        const writes: Promise<unknown>[] = [];
        for (const card of chunk) {
          const photo = byQuery.get(imageQueryFor(card));
          // `undefined` means the run stopped before reaching that query;
          // `null` means Unsplash simply had nothing for it.
          if (photo === undefined) continue;
          done += 1;
          if (!photo) continue;
          const imageUrl = encodeUnsplashUrl(photo);
          writes.push(updateCard(card.id, { imageUrl }));
          filled.push({ ...card, imageUrl });
        }
        // One round of writes rather than one round trip per card: a 200-card
        // deck otherwise re-renders the whole picker grid 200 times mid-run.
        await Promise.all(writes);

        stopped = batch.stopped;
        // Each picture costs two Unsplash requests (the search and the download
        // ping), so stop rather than start a round we can't pay for.
        if (batch.rateLimited || (batch.remaining !== null && batch.remaining < 2)) {
          rateLimited = true;
        }
        if (rateLimited || stopped) break;
      }
    } catch (err) {
      failure = err instanceof Error ? err.message : 'Failed to fetch images';
    } finally {
      // Committed whether the run finished or threw: the pictures already
      // written are in the database either way, and leaving those cards ticked
      // means a retry re-fetches them — replacing photos that were fine and
      // spending an allowance the retry exists to conserve.
      if (filled.length > 0) {
        const written = new Set(filled.map((c) => c.id));
        setSelectedIds((prev) => new Set([...prev].filter((id) => !written.has(id))));
      }
      setResult({ added: filled.length, rateLimited, missed: selected.length - done });
      setError(failure);
      setFilling(false);
      // Not on a failure: onFilled hands the flow to the review dialog, which
      // would close the picker and take the error message with it. The picker
      // stays put so the message is read, with the saved pictures on show.
      if (filled.length > 0 && !failure) onFilled?.(filled);
    }
  }, [filling, onFilled, selected, updateCard]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setSelectedIds(new Set(missingIds));
  }, [missingIds]);

  return {
    pickable,
    selectedIds,
    selectedCount: selected.length,
    missingCount: missingIds.length,
    toggle,
    selectAll,
    selectNone,
    filling,
    result,
    error,
    fetchSelectedImages,
    reset,
  };
}
