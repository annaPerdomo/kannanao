/**
 * The 2026-08-26 outage had PostgREST down while Auth stayed healthy, so every
 * read failed and the app rendered "no decks yet". `kind` separates those two.
 * Keep this a leaf: the client data path and the API routes both import it.
 */

import { errorMessage } from './errorMessage';

export type DataErrorKind = 'offline' | 'upstream' | 'auth' | 'notFound' | 'unknown';

interface DataErrorOptions {
  status?: number;
  code?: string;
  cause?: unknown;
}

export class DataError extends Error {
  readonly kind: DataErrorKind;
  readonly status?: number;
  readonly code?: string;
  // declare, not a field: a real field is enumerable, and JSON.stringify would
  // then walk into the raw upstream object.
  declare readonly cause?: unknown;

  constructor(kind: DataErrorKind, message: string, options: DataErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'DataError';
    this.kind = kind;
    this.status = options.status;
    this.code = options.code;
  }
}

// Envoy's connect-failure body, captured during the outage. The trailing `111`
// is an errno, not a stable string — match the prose, not the number.
const UPSTREAM_BODY = /upstream connect error|delayed connect error/i;

const OFFLINE_MESSAGE =
  /failed to fetch|fetch failed|networkerror|network request failed|load failed|connection refused|err_(internet_disconnected|network_changed|connection_refused|name_not_resolved)/i;

/** supabase-js flattens a rejected fetch to `{ message: "<ErrorName>: <message>" }`. */
const FLATTENED_NAME = /^\s*(TypeError|FetchError)\s*:/i;
const FLATTENED_ABORT = /^\s*(AbortError|TimeoutError)\s*:/i;
const ABORT_HINT = /request was aborted/i;

/** PostgREST's "no rows returned" from a `.single()` query — an absence, not an outage. */
const NO_ROWS_CODE = 'PGRST116';

// A reachable PostgREST answers 404 PGRST205 for a table and PGRST202 for a
// function when its schema cache is stale. The server is up: not an absence.
const SCHEMA_CACHE_CODES = new Set(['PGRST202', 'PGRST205']);

const AUTH_STATUSES = new Set([401, 403]);

const RETRY_STATUSES = new Set([408, 429]);

const MAX_BODY_CHARS = 2048;

export function isDataError(err: unknown): err is DataError {
  return err instanceof DataError;
}

export function isRetryable(err: DataError): boolean {
  if (err.kind === 'offline' || err.kind === 'upstream') return true;
  return err.status !== undefined && RETRY_STATUSES.has(err.status);
}

/** Never throws: it runs inside catch blocks, where the thrown shape is unknown. */
export function toDataError(err: unknown, ctx?: { status?: number }): DataError {
  if (isDataError(err)) return err;

  // httpStatus, not `??` alone: supabase-js reports a rejected fetch as
  // `status: 0`, which would otherwise read as a real answer from a server.
  const status = httpStatus(ctx?.status) ?? statusOf(err);
  const code = codeOf(err);
  const text = describe(err);
  const kind = classify({ err, status, code, text: withCause(err, text) });

  return new DataError(kind, text.trim() || defaultMessage(kind, status), {
    status,
    code,
    cause: err,
  });
}

// The outage answered 503 with `content-type: text/plain`, so a body that will
// not parse as JSON still has to classify.
export async function dataErrorFromResponse(res: Response): Promise<DataError> {
  let body = '';
  try {
    // clone: the caller still holds this Response and may still need its body.
    body = (await res.clone().text()).slice(0, MAX_BODY_CHARS);
  } catch {
    body = '';
  }

  let text = body.trim();
  let code: string | undefined;
  const parsed = parseJson(text);
  if (parsed) {
    text =
      firstString(parsed, ['message', 'error', 'error_description', 'details', 'hint']) ?? text;
    code = codeOf(parsed);
  }

  const status = res.status;
  const kind = classify({ err: res, status, code, text });

  return new DataError(kind, text || defaultMessage(kind, status), { status, code, cause: res });
}

interface Signals {
  err: unknown;
  status?: number;
  code?: string;
  text: string;
}

function classify(signals: Signals): DataErrorKind {
  const { err, status, code, text } = signals;

  // Body before status: the gateway sent the Envoy body under more than one
  // status code, so the body is the more reliable of the two signals.
  if (UPSTREAM_BODY.test(text)) return 'upstream';

  if (code === NO_ROWS_CODE) return 'notFound';
  if (code !== undefined && SCHEMA_CACHE_CODES.has(code)) return 'upstream';

  if (isAborted(signals)) return 'upstream';

  if (status !== undefined) {
    if (status >= 500) return 'upstream';
    if (AUTH_STATUSES.has(status)) return 'auth';
    // A code alongside a 404 is the backend rejecting the request; only a bare
    // 404 is an absence. Collapsing this is what renders "no decks yet".
    if (status === 404) return code === undefined ? 'notFound' : 'unknown';
    return 'unknown';
  }

  if (code === undefined && isOffline(err, text)) return 'offline';

  return 'unknown';
}

function isOffline(err: unknown, text: string): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (!OFFLINE_MESSAGE.test(text)) return false;
  return err instanceof TypeError || FLATTENED_NAME.test(text);
}

function isAborted({ err, code, text }: Signals): boolean {
  if (code === 'ABORT_ERR') return true;

  const rec = asRecord(err);
  if (rec?.name === 'AbortError' || rec?.name === 'TimeoutError') return true;
  if (typeof rec?.hint === 'string' && ABORT_HINT.test(rec.hint)) return true;

  return FLATTENED_ABORT.test(text);
}

function statusOf(err: unknown): number | undefined {
  if (isResponse(err)) return err.status;
  const rec = asRecord(err);
  if (!rec) return undefined;

  const direct = httpStatus(rec.status) ?? httpStatus(rec.statusCode);
  if (direct !== undefined) return direct;

  return httpStatus(asRecord(rec.response)?.status);
}

function httpStatus(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599)
    return value;
  if (typeof value === 'string' && /^\d{3}$/.test(value)) return httpStatus(Number(value));
  return undefined;
}

function codeOf(err: unknown): string | undefined {
  const code = asRecord(err)?.code;
  return typeof code === 'string' && code.trim() ? code.trim() : undefined;
}

/** Never JSON.stringifies the input: it may be circular and this must not throw. */
function describe(err: unknown): string {
  if (isResponse(err))
    return err.statusText ? `HTTP ${err.status} ${err.statusText}` : `HTTP ${err.status}`;
  if (err === null) return 'null';
  if (err === undefined) return 'undefined';
  if (typeof err === 'string') return err;

  const rec = asRecord(err);
  if (rec) {
    const text = errorMessage(rec, '') || firstString(rec, ['error', 'error_description', 'hint']);
    if (text) return text;
    return err instanceof Error ? err.name : '';
  }

  return String(err);
}

function withCause(err: unknown, text: string): string {
  const cause = asRecord(err)?.cause;
  if (cause === undefined || cause === null) return text;

  const nested = describe(cause);
  return nested && nested !== text ? `${text}\n${nested}` : text;
}

function defaultMessage(kind: DataErrorKind, status?: number): string {
  return status === undefined
    ? `Data request failed (${kind})`
    : `Data request failed (${kind}, HTTP ${status})`;
}

function firstString(rec: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

function parseJson(text: string): Record<string, unknown> | undefined {
  if (!text.startsWith('{')) return undefined;
  try {
    return asRecord(JSON.parse(text));
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function isResponse(value: unknown): value is Response {
  return typeof Response !== 'undefined' && value instanceof Response;
}
