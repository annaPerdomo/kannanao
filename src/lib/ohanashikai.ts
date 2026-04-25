'use client';

import { isConfigured, sb, showConfigBanner } from '@/lib/supabase';
import type { Ohanashikai, OhanashikaiLine } from '@/types/ohanashikai';

// ─── Row types ────────────────────────────────────────────────────────────────

interface OhanashikaiRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string | null;
  pinned: boolean | null;
}

interface OhanashikaiLineRow {
  id: string;
  ohanashikai_id: string;
  text: string;
  order_index: number;
  created_at: string | null;
}

function toMs(value: string | null): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function rowToOhanashikai(row: OhanashikaiRow, lineCount: number): Ohanashikai {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    lineCount,
    createdAt: toMs(row.created_at),
    pinned: row.pinned ?? false,
  };
}

function rowToLine(row: OhanashikaiLineRow): OhanashikaiLine {
  return {
    id: row.id,
    ohanashikaiId: row.ohanashikai_id,
    text: row.text,
    orderIndex: row.order_index,
  };
}

// ─── Ohanashikai CRUD ─────────────────────────────────────────────────────────

export async function loadOhanashikais(userId: string): Promise<Ohanashikai[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  const { data: rows, error } = await sb
    .from('ohanashikais')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading ohanashikais', error);
    return [];
  }

  const items = rows ?? [];
  if (items.length === 0) return [];

  const ids = items.map((r: OhanashikaiRow) => r.id);
  const { data: lineCounts } = await sb
    .from('ohanashikai_lines')
    .select('ohanashikai_id')
    .in('ohanashikai_id', ids);

  const countMap: Record<string, number> = {};
  (lineCounts ?? []).forEach((l: { ohanashikai_id: string }) => {
    countMap[l.ohanashikai_id] = (countMap[l.ohanashikai_id] ?? 0) + 1;
  });

  return items.map((row: OhanashikaiRow) => rowToOhanashikai(row, countMap[row.id] ?? 0));
}

export async function dbCreateOhanashikai(
  title: string,
  description?: string,
): Promise<Ohanashikai> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await sb
    .from('ohanashikais')
    .insert({ title, description: description ?? null, user_id: user.id })
    .select()
    .single();

  if (error || !data) throw error ?? new Error('Unable to create ohanashikai');
  return rowToOhanashikai(data as OhanashikaiRow, 0);
}

export async function dbDeleteOhanashikai(id: string): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const { error } = await sb.from('ohanashikais').delete().eq('id', id);
  if (error) throw error;
}

export async function dbPinOhanashikai(id: string, pinned: boolean): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    return;
  }
  const { error } = await sb.from('ohanashikais').update({ pinned }).eq('id', id);
  if (error) console.error('Error pinning ohanashikai', error);
}

export async function dbUpdateOhanashikaiTitle(
  id: string,
  title: string,
  description?: string,
): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    return;
  }
  const { error } = await sb
    .from('ohanashikais')
    .update({ title, description: description ?? null })
    .eq('id', id);
  if (error) console.error('Error updating ohanashikai', error);
}

// ─── Lines CRUD ───────────────────────────────────────────────────────────────

export async function loadOhanashikaiLines(ohanashikaiId: string): Promise<OhanashikaiLine[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  const { data, error } = await sb
    .from('ohanashikai_lines')
    .select('*')
    .eq('ohanashikai_id', ohanashikaiId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error loading lines', error);
    return [];
  }
  return (data ?? []).map(rowToLine);
}

export async function dbCreateOhanashikaiLine(
  ohanashikaiId: string,
  text: string,
  orderIndex: number,
): Promise<OhanashikaiLine> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }

  const { data, error } = await sb
    .from('ohanashikai_lines')
    .insert({ ohanashikai_id: ohanashikaiId, text: text.trim(), order_index: orderIndex })
    .select()
    .single();

  if (error || !data) throw error ?? new Error('Unable to create line');
  return rowToLine(data as OhanashikaiLineRow);
}

export async function dbUpdateOhanashikaiLine(
  id: string,
  text: string,
): Promise<OhanashikaiLine | null> {
  if (!isConfigured()) {
    showConfigBanner();
    return null;
  }

  const { data, error } = await sb
    .from('ohanashikai_lines')
    .update({ text: text.trim() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating line', error);
    return null;
  }
  return rowToLine(data as OhanashikaiLineRow);
}

export async function dbDeleteOhanashikaiLine(id: string): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const { error } = await sb.from('ohanashikai_lines').delete().eq('id', id);
  if (error) throw error;
}

/** Bulk-insert multiple lines starting at startOrderIndex */
export async function dbImportOhanashikaiLines(
  ohanashikaiId: string,
  texts: string[],
  startOrderIndex: number,
): Promise<OhanashikaiLine[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  const rows = texts
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text, i) => ({
      ohanashikai_id: ohanashikaiId,
      text,
      order_index: startOrderIndex + i,
    }));

  if (rows.length === 0) return [];

  const { data, error } = await sb.from('ohanashikai_lines').insert(rows).select();

  if (error) {
    console.error('Error importing lines', error);
    return [];
  }
  return (data ?? []).map(rowToLine);
}
