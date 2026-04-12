'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { loadTodos, dbCreateTodo, dbUpdateTodo, dbDeleteTodo } from '@/lib/supabase';
import type { Todo } from '@/types/todo';

export function useTodos() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setTodos([]); setLoading(false); return; }
    setLoading(true);
    loadTodos(user.id)
      .then(setTodos)
      .catch(() => setError('Could not load your to-do list'))
      .finally(() => setLoading(false));
  }, [user]);

  const addTodo = useCallback(async (text: string, frequencyDays: number[] = [], assignedDateISO?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const todo = await dbCreateTodo(trimmed, frequencyDays, assignedDateISO);
      setTodos((prev) => [...prev, todo]);
    } catch {
      setError('Could not add item — please try again');
    }
  }, []);

  // Returns true if the task was just marked as completed (for XP award)
  const toggleTodo = useCallback(async (id: string, date: string): Promise<boolean> => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return false;
    const wasCompleted = todo.completedDates.includes(date);
    const newCompletedDates = wasCompleted
      ? todo.completedDates.filter((d) => d !== date)
      : [...todo.completedDates, date];
    const today = new Date().toISOString().split('T')[0];
    const nowCompleted = newCompletedDates.includes(today);
    const updated = { ...todo, completedDates: newCompletedDates, completed: nowCompleted };
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    try {
      await dbUpdateTodo(id, { completedDates: newCompletedDates, completed: nowCompleted });
    } catch {
      setTodos((prev) => prev.map((t) => (t.id === id ? todo : t)));
      setError('Could not update item — please try again');
    }
    return !wasCompleted;
  }, [todos]);

  const editTodo = useCallback(async (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const prev_todo = todos.find((t) => t.id === id);
    if (!prev_todo) return;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text: trimmed } : t)));
    try {
      await dbUpdateTodo(id, { text: trimmed });
    } catch {
      setTodos((prev) => prev.map((t) => (t.id === id ? prev_todo : t)));
      setError('Could not save changes — please try again');
    }
  }, [todos]);

  const editEmoji = useCallback(async (id: string, emoji: string) => {
    const prev_todo = todos.find((t) => t.id === id);
    if (!prev_todo) return;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, emoji } : t)));
    try {
      await dbUpdateTodo(id, { emoji });
    } catch {
      setTodos((prev) => prev.map((t) => (t.id === id ? prev_todo : t)));
      setError('Could not save emoji — please try again');
    }
  }, [todos]);

  const editTodoAdvanced = useCallback(async (
    id: string,
    text: string,
    frequencyDays: number[],
    assignedDateISO: string | null
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const prev_todo = todos.find((t) => t.id === id);
    if (!prev_todo) return;
    // Calculate new createdAt if assignedDateISO is different and it's a single-day task
    let newCreatedAt = prev_todo.createdAt;
    if (frequencyDays.length === 0 && assignedDateISO) {
      newCreatedAt = new Date(`${assignedDateISO}T12:00:00.000Z`).getTime();
    }
    const updated = { ...prev_todo, text: trimmed, frequencyDays, createdAt: newCreatedAt };
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    try {
      const dbPatch: Parameters<typeof dbUpdateTodo>[1] = { text: trimmed, frequencyDays };
      // Only update createdAt in DB if it changed
      if (newCreatedAt !== prev_todo.createdAt) {
        dbPatch.createdAt = newCreatedAt;
      }
      await dbUpdateTodo(id, dbPatch);
    } catch {
      setTodos((prev) => prev.map((t) => (t.id === id ? prev_todo : t)));
      setError('Could not save changes — please try again');
    }
  }, [todos]);

  const deleteTodo = useCallback(async (id: string) => {
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await dbDeleteTodo(id);
    } catch {
      setTodos(snapshot);
      setError('Could not delete item — please try again');
    }
  }, [todos]);

  const clearError = useCallback(() => setError(null), []);

  return { todos, loading, error, addTodo, toggleTodo, editTodo, editEmoji, editTodoAdvanced, deleteTodo, clearError };
}
