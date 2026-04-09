'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Ohanashikai, OhanashikaiLine } from '@/types/ohanashikai';
import {
  loadOhanashikais,
  dbCreateOhanashikai,
  dbDeleteOhanashikai,
  dbUpdateOhanashikaiTitle,
  loadOhanashikaiLines,
  dbCreateOhanashikaiLine,
  dbUpdateOhanashikaiLine,
  dbDeleteOhanashikaiLine,
  dbImportOhanashikaiLines,
} from '@/lib/ohanashikai';

// ─── useOhanashikais ──────────────────────────────────────────────────────────

export function useOhanashikais() {
  const { user } = useAuth();
  const [ohanashikais, setOhanashikais] = useState<Ohanashikai[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const data = await loadOhanashikais(user.id);
    setOhanashikais(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createOhanashikai = useCallback(async (title: string, description?: string) => {
    const item = await dbCreateOhanashikai(title, description);
    setOhanashikais((prev) => [...prev, item]);
    return item;
  }, []);

  const deleteOhanashikai = useCallback(async (id: string) => {
    await dbDeleteOhanashikai(id);
    setOhanashikais((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const renameOhanashikai = useCallback(
    async (id: string, title: string, description?: string) => {
      await dbUpdateOhanashikaiTitle(id, title, description);
      setOhanashikais((prev) =>
        prev.map((o) => (o.id === id ? { ...o, title, description } : o))
      );
    },
    [],
  );

  return { ohanashikais, loading, createOhanashikai, deleteOhanashikai, renameOhanashikai, refetch: fetchAll };
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

  useEffect(() => { fetchLines(); }, [fetchLines]);

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

  return { lines, loading, addLine, updateLine, deleteLine, importLines };
}
