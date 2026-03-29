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
  // Unsplash returns array; grab first result URL
  if (Array.isArray(data) && data.length > 0) {
    return data[0]?.urls?.regular ?? data[0]?.url ?? null;
  }
  if (data?.urls?.regular) return data.urls.regular;
  return null;
}
