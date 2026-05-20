'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import {
  dbCreateOhanashikai,
  dbCreateOhanashikaiLine,
  dbDeleteOhanashikai,
  dbDeleteOhanashikaiLine,
  dbImportOhanashikaiLines,
  dbPinOhanashikai,
  dbReorderOhanashikaiLines,
  dbUpdateOhanashikaiLine,
  dbUpdateOhanashikaiTitle,
  loadOhanashikaiLines,
  loadOhanashikais,
} from '@/lib/ohanashikai';
import type { Ohanashikai, OhanashikaiLine } from '@/types/ohanashikai';

// ─── useOhanashikais ──────────────────────────────────────────────────────────

export function useOhanashikais(enabled = true) {
  const { user } = useAuth();
  const [ohanashikais, setOhanashikais] = useState<Ohanashikai[]>([]);
  const [loading, setLoading] = useState(enabled);

  const fetchAll = useCallback(async () => {
    if (!enabled || !user) {
      setOhanashikais([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await loadOhanashikais(user.id);
    setOhanashikais(data);
    setLoading(false);
  }, [user, enabled]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createOhanashikai = useCallback(async (title: string, description?: string) => {
    const item = await dbCreateOhanashikai(title, description);
    setOhanashikais((prev) => [...prev, item]);
    return item;
  }, []);

  const deleteOhanashikai = useCallback(async (id: string) => {
    await dbDeleteOhanashikai(id);
    setOhanashikais((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const renameOhanashikai = useCallback(async (id: string, title: string, description?: string) => {
    await dbUpdateOhanashikaiTitle(id, title, description);
    setOhanashikais((prev) => prev.map((o) => (o.id === id ? { ...o, title, description } : o)));
  }, []);

  const pinOhanashikai = useCallback(async (id: string, pinned: boolean) => {
    setOhanashikais((prev) => prev.map((o) => (o.id === id ? { ...o, pinned } : o)));
    try {
      await dbPinOhanashikai(id, pinned);
    } catch {
      setOhanashikais((prev) => prev.map((o) => (o.id === id ? { ...o, pinned: !pinned } : o)));
    }
  }, []);

  return {
    ohanashikais,
    loading,
    createOhanashikai,
    deleteOhanashikai,
    renameOhanashikai,
    pinOhanashikai,
    refetch: fetchAll,
  };
}

// ─── useOhanashikaiLines ──────────────────────────────────────────────────────

export function useOhanashikaiLines(ohanashikaiId: string) {
  const [lines, setLines] = useState<OhanashikaiLine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLines = useCallback(async () => {
    setLoading(true);
    const data = await loadOhanashikaiLines(ohanashikaiId);
    setLines(data);
    setLoading(false);
  }, [ohanashikaiId]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  const addLine = useCallback(
    async (text: string) => {
      const orderIndex = lines.length;
      const line = await dbCreateOhanashikaiLine(ohanashikaiId, text, orderIndex);
      setLines((prev) => [...prev, line]);
      return line;
    },
    [ohanashikaiId, lines.length],
  );

  const updateLine = useCallback(async (id: string, text: string) => {
    const updated = await dbUpdateOhanashikaiLine(id, text);
    if (updated) setLines((prev) => prev.map((l) => (l.id === id ? updated : l)));
    return updated;
  }, []);

  const deleteLine = useCallback(async (id: string) => {
    await dbDeleteOhanashikaiLine(id);
    setLines((prev) => prev.filter((l) => l.id !== id).map((l, i) => ({ ...l, orderIndex: i })));
  }, []);

  const importLines = useCallback(
    async (texts: string[]) => {
      const startIndex = lines.length;
      const newLines = await dbImportOhanashikaiLines(ohanashikaiId, texts, startIndex);
      setLines((prev) => [...prev, ...newLines]);
    },
    [ohanashikaiId, lines.length],
  );

  const reorderLines = useCallback(
    async (reordered: OhanashikaiLine[]) => {
      const prev = lines;
      const updated = reordered.map((l, i) => ({ ...l, orderIndex: i }));
      setLines(updated);
      try {
        await dbReorderOhanashikaiLines(
          updated.map((l) => ({ id: l.id, orderIndex: l.orderIndex })),
        );
      } catch {
        setLines(prev);
      }
    },
    [lines],
  );

  return { lines, loading, addLine, updateLine, deleteLine, importLines, reorderLines };
}
