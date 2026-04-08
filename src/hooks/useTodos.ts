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

  const addTodo = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const todo = await dbCreateTodo(trimmed);
      setTodos((prev) => [...prev, todo]);
    } catch {
      setError('Could not add item — please try again');
    }
  }, []);

  const toggleTodo = useCallback(async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const updated = { ...todo, completed: !todo.completed };
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    try {
      await dbUpdateTodo(id, { completed: updated.completed });
    } catch {
      setTodos((prev) => prev.map((t) => (t.id === id ? todo : t)));
      setError('Could not update item — please try again');
    }
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

  return { todos, loading, error, addTodo, toggleTodo, editTodo, deleteTodo, clearError };
}
