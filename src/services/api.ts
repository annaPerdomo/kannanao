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

export async function uploadImage(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ''),
  );

  const res = await fetch(`${BASE}/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, mimeType: file.type }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to upload image');
  }
  const data = await res.json();
  return data.url;
}

export function isStorageImage(url: string | undefined): boolean {
  return !!url && url.includes('card-images');
}

export async function deleteStorageImage(url: string): Promise<void> {
  const res = await fetch(`${BASE}/generate-image`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to delete image');
  }
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
