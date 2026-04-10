import type { GeneratedCard, GeneratePayload } from '@/types/flashcard';

const BASE = '/api';

export async function generateFlashcards(payload: GeneratePayload): Promise<GeneratedCard[]> {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Generate failed: ${res.statusText}`);
  return res.json();
}

export async function formatFurigana(lines: string[]): Promise<string[]> {
  const res = await fetch(`${BASE}/furigana`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines }),
  });
  if (!res.ok) throw new Error(`Furigana formatting failed: ${res.statusText}`);
  const data = await res.json();
  return data.lines as string[];
}

export async function fetchImage(query: string): Promise<string | null> {
  const res = await fetch(`${BASE}/images?query=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body?.detail ?? body?.error ?? res.statusText;
    throw new Error(detail);
  }
  const data = await res.json();
  // Unsplash search API returns an object with a results array.
  const results = Array.isArray(data) ? data : data?.results;
  if (Array.isArray(results) && results.length > 0) {
    return results[0]?.urls?.regular ?? results[0]?.url ?? null;
  }
  return null;
}
