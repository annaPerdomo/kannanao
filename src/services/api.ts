import { sb } from '@/lib/supabase';
import type { GeneratedCard, GeneratePayload } from '@/types/flashcard';
import type { ApplyDeckResult, LessonPlan, LessonPlanResponse } from '@/types/lessonPlan';
import type { DbPracticeSentence } from '@/types/practiceSentence';

const BASE = '/api';

/** Returns Authorization header with the current Supabase session token, if available. */
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function generateFlashcards(payload: GeneratePayload): Promise<GeneratedCard[]> {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Generate failed: ${res.statusText}`);
  return res.json();
}

export async function formatFurigana(lines: string[]): Promise<string[]> {
  const res = await fetch(`${BASE}/furigana`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ lines }),
  });
  if (!res.ok) throw new Error(`Furigana formatting failed: ${res.statusText}`);
  const data = await res.json();
  return data.lines as string[];
}

export async function uploadImage(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const base64 = btoa(new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ''));

  const res = await fetch(`${BASE}/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to delete image');
  }
}

export interface UnsplashImageResult {
  url: string;
  downloadLocation: string;
  photographerName: string;
  photographerUrl: string;
  photoPageUrl: string;
}

export interface UnsplashAttribution {
  name: string;
  photographerUrl: string;
  photoPageUrl: string;
}

// Encodes Unsplash attribution into the URL hash so it persists when stored in DB.
// Browsers strip the hash before making HTTP requests, so the image still loads correctly.
export function encodeUnsplashUrl(result: UnsplashImageResult): string {
  const fragment = `unsplash:name=${encodeURIComponent(result.photographerName)}&pu=${encodeURIComponent(result.photographerUrl)}&pp=${encodeURIComponent(result.photoPageUrl)}`;
  return `${result.url}#${fragment}`;
}

export function decodeUnsplashAttribution(url: string): UnsplashAttribution | null {
  const hashIndex = url.indexOf('#unsplash:');
  if (hashIndex === -1) return null;
  const params = new URLSearchParams(url.slice(hashIndex + '#unsplash:'.length));
  const name = params.get('name');
  const photographerUrl = params.get('pu');
  const photoPageUrl = params.get('pp');
  if (!name) return null;
  return { name, photographerUrl: photographerUrl ?? '', photoPageUrl: photoPageUrl ?? '' };
}

export async function fetchImage(query: string): Promise<UnsplashImageResult | null> {
  const res = await fetch(`${BASE}/images?query=${encodeURIComponent(query)}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? body?.error ?? res.statusText);
  }
  const data = await res.json();
  return data.result ?? null;
}

/**
 * How many queries a caller sends per batch. Must stay at or below
 * MAX_BATCH_QUERIES in `app/api/_lib/unsplash.ts`, which the route enforces.
 */
export const IMAGE_BATCH_SIZE = 25;

export interface ImageBatchItem {
  query: string;
  /** Ask for a photo other than the top hit — this card is replacing one. */
  variety?: boolean;
}

export interface BatchImagesResponse {
  results: { query: string; result: UnsplashImageResult | null }[];
  /** Unsplash's hourly allowance ran out partway through — retry later. */
  rateLimited: boolean;
  /**
   * The run ended early on a fault rather than on the allowance. The queries
   * with no entry in `results` were never asked, so they must not be reported
   * as "no picture found".
   */
  stopped: boolean;
  /** Unsplash requests left this hour, or null when it didn't say. */
  remaining: number | null;
}

/**
 * Search up to MAX_BATCH_QUERIES photos in one request. The route already
 * triggers each photo's download ping, so callers must not also call
 * triggerUnsplashDownload for these results.
 */
export async function fetchImagesBatch(items: ImageBatchItem[]): Promise<BatchImagesResponse> {
  const res = await fetch(`${BASE}/images/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? res.statusText);
  }
  return res.json();
}

export async function triggerUnsplashDownload(downloadLocation: string): Promise<void> {
  const headers = await authHeaders();
  // Fire-and-forget — errors are non-critical
  fetch(`${BASE}/images/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ downloadLocation }),
  }).catch(() => {});
}

/* ── Kotoba Bubble practice sentences ──────────────────────────── */

/** `?memberId=` selects a learner's personalised sentence set where one exists. */
function memberQuery(memberId?: string): string {
  return memberId ? `?memberId=${encodeURIComponent(memberId)}` : '';
}

export async function fetchPracticeSentences(
  deckId: string,
  memberId?: string,
): Promise<DbPracticeSentence[]> {
  const res = await fetch(`${BASE}/deck/${deckId}/practice-sentences${memberQuery(memberId)}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to load practice sentences');
  }
  const data = await res.json();
  return data.sentences as DbPracticeSentence[];
}

export async function generatePracticeSentences(
  deckId: string,
  memberId?: string,
): Promise<DbPracticeSentence[]> {
  const res = await fetch(`${BASE}/deck/${deckId}/practice-sentences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(memberId ? { memberId } : {}),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to generate practice sentences');
  }
  const data = await res.json();
  return data.sentences as DbPracticeSentence[];
}

export interface BatchSentenceResult {
  deckId: string;
  status: 'generated' | 'skipped' | 'failed';
  count?: number;
  error?: string;
}

export async function generatePracticeSentencesBatch(
  deckIds: string[],
  memberId?: string,
): Promise<BatchSentenceResult[]> {
  const res = await fetch(`${BASE}/group/practice-sentences/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ deckIds, memberId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to generate practice sentences');
  }
  const data = await res.json();
  return data.results as BatchSentenceResult[];
}

export async function updatePracticeSentences(
  deckId: string,
  updates: { id: string; sentence_jp?: string; sentence_en?: string }[],
  deletes: string[],
): Promise<DbPracticeSentence[]> {
  const res = await fetch(`${BASE}/deck/${deckId}/practice-sentences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ updates, deletes }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to update sentences');
  }
  const data = await res.json();
  return data.sentences as DbPracticeSentence[];
}

export async function recordMeaningPeek(deckId: string, sentenceId: string): Promise<void> {
  await fetch(`${BASE}/deck/${deckId}/practice-sentences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ sentenceId }),
  }).catch(() => {});
}

export async function deletePracticeSentences(deckId: string, memberId?: string): Promise<void> {
  const res = await fetch(`${BASE}/deck/${deckId}/practice-sentences${memberQuery(memberId)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to delete practice sentences');
  }
}

/* ── Lesson Builder ────────────────────────────────────────────── */

export async function buildLessonPlan(payload: {
  memberId: string;
  goal: string;
  weeks: number;
  cardsPerDeck: number;
  documents?: Array<{ base64: string; mimeType: string }>;
}): Promise<LessonPlanResponse> {
  const res = await fetch(`${BASE}/group/lesson-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to build the plan');
  }
  return res.json();
}

export async function applyLessonPlan(payload: {
  groupId: string;
  memberId: string;
  plan: LessonPlan;
  firstDueDate: string;
  requiredAccuracy?: number | null;
  requiredMode?: string | null;
  /** Stable across retries so a resumed apply doesn't duplicate decks. */
  planId?: string;
  /** Also make each deck's Kotoba Bubble sentences — one Gemini call per deck. */
  withSentences?: boolean;
}): Promise<{ results: ApplyDeckResult[] }> {
  const res = await fetch(`${BASE}/group/lesson-plan/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to create the decks');
  }
  return res.json();
}
