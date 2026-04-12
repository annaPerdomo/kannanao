import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { loadEventTypes, dbCreateEventType, dbDeleteEventType } from '@/lib/supabase';
import type { EntryType } from '@/types/todo';

export function useEventTypes() {
  const { user } = useAuth();
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setEntryTypes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadEventTypes(user.id)
      .then((types) => setEntryTypes(types))
      .catch(() => setError('Could not load event types'))
      .finally(() => setLoading(false));
  }, [user]);

  const addEntryType = useCallback(async (name: string, emoji: string, color: string) => {
    if (!user) throw new Error('Not authenticated');
    setError(null);
    const type = await dbCreateEventType(user.id, name, emoji, color);
    setEntryTypes((prev) => [...prev, type]);
    return type;
  }, [user]);

  const deleteEntryType = useCallback(async (id: string) => {
    setError(null);
    try {
      await dbDeleteEventType(id);
      setEntryTypes((prev) => prev.filter((type) => type.id !== id));
    } catch {
      setError('Could not delete event type');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    entryTypes,
    loading,
    error,
    addEntryType,
    deleteEntryType,
    clearError,
  };
}
