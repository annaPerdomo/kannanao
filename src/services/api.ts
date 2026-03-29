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

export async function fetchImage(query: string): Promise<string | null> {
  const res = await fetch(`${BASE}/images?query=${encodeURIComponent(query)}`);
  if (!res.ok) return null;
  const data = await res.json();
  // Unsplash search API returns an object with a results array.
  const results = Array.isArray(data) ? data : data?.results;
  if (Array.isArray(results) && results.length > 0) {
    return results[0]?.urls?.regular ?? results[0]?.url ?? null;
  }
  return null;
}
