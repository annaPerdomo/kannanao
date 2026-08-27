// Keep this a leaf: API routes import it too.

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
  // declare, not a field: a field is enumerable, and JSON.stringify would then
  // walk the raw upstream object.
  declare readonly cause?: unknown;

  constructor(kind: DataErrorKind, message: string, options: DataErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'DataError';
    this.kind = kind;
    this.status = options.status;
    this.code = options.code;
  }
}

// Envoy's connect-failure body. The trailing `111` is an errno — match the prose.
const UPSTREAM_BODY = /upstream connect error|delayed connect error/i;

const OFFLINE_MESSAGE =
  /failed to fetch|fetch failed|networkerror|network request failed|load failed|connection refused|err_(internet_disconnected|network_changed|connection_refused|name_not_resolved)/i;

// Node and undici name a failed connect with an errno instead of a TypeError,
// and only these mean the request never reached a server.
const OFFLINE_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
]);

// A rejected fetch never reaches us as a TypeError: postgrest-js flattens it to
// `{ message: "TypeError: ..." }`, auth-js and functions-js rethrow it as *FetchError.
const FLATTENED_NAME = /^\s*(TypeError|FetchError)\s*:/i;
const FETCH_ERROR_NAME = /fetcherror$/i;

const FLATTENED_ABORT = /^\s*(AbortError|TimeoutError)\s*:/i;
const ABORT_HINT = /request was aborted/i;

const NO_ROWS_CODE = 'PGRST116';

// A reachable PostgREST answers 404 PGRST205 for a table and PGRST202 for a
// function when its schema cache is stale. The server is up: not an absence.
const SCHEMA_CACHE_CODES = new Set(['PGRST202', 'PGRST205']);

const AUTH_STATUSES = new Set([401, 403]);

const RETRY_STATUSES = new Set([408, 429]);

const MAX_BODY_CHARS = 2048;

const MAX_CAUSE_DEPTH = 3;

export function isDataError(err: unknown): err is DataError {
  return err instanceof DataError;
}

export function isRetryable(err: DataError): boolean {
  if (err.kind === 'offline' || err.kind === 'upstream') return true;
  return err.status !== undefined && RETRY_STATUSES.has(err.status);
}

export function toDataError(err: unknown, ctx?: { status?: number }): DataError {
  if (isDataError(err)) return err;

  try {
    // httpStatus, not `??`: supabase-js reports a rejected fetch as `status: 0`.
    const status = httpStatus(ctx?.status) ?? statusOf(err);
    const code = codeOf(err);
    const text = describe(err);
    const kind = classify({ err, status, code, text: withCause(err, text) });

    return new DataError(kind, text.trim() || defaultMessage(kind, status), {
      status,
      code,
      cause: err,
    });
  } catch {
    return new DataError('unknown', defaultMessage('unknown'), { cause: err });
  }
}

export async function dataErrorFromResponse(res: Response): Promise<DataError> {
  const body = await readCappedBody(res);

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

// `.text().slice()` first buffers a dead gateway's megabytes of proxy HTML.
async function readCappedBody(res: Response): Promise<string> {
  try {
    const clone = res.clone();
    const stream = clone.body;
    if (!stream) return (await clone.text()).slice(0, MAX_BODY_CHARS);

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let text = '';
    try {
      while (text.length < MAX_BODY_CHARS) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
    } finally {
      // Not awaited: a tee's cancel settles only once BOTH branches cancel, and
      // the caller still holds the other one.
      void reader.cancel().catch(() => undefined);
    }
    return text.slice(0, MAX_BODY_CHARS);
  } catch {
    return '';
  }
}

interface Signals {
  err: unknown;
  status?: number;
  code?: string;
  text: string;
}

function classify(signals: Signals): DataErrorKind {
  const { err, status, code, text } = signals;

  if (UPSTREAM_BODY.test(text)) return 'upstream';

  if (code === NO_ROWS_CODE) return 'notFound';
  if (code !== undefined && SCHEMA_CACHE_CODES.has(code)) return 'upstream';

  if (isAborted(signals)) return 'upstream';

  if (status !== undefined) {
    if (status >= 500) return 'upstream';
    if (AUTH_STATUSES.has(status)) return 'auth';
    if (status === 404) return 'notFound';
    return 'unknown';
  }

  if (code !== undefined && OFFLINE_CODES.has(code)) return 'offline';
  if (code === undefined && isOffline(err, text)) return 'offline';

  return 'unknown';
}

function isOffline(err: unknown, text: string): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (!OFFLINE_MESSAGE.test(text)) return false;
  if (err instanceof TypeError || FLATTENED_NAME.test(text)) return true;
  return FETCH_ERROR_NAME.test(nameOf(err));
}

function isAborted({ err, code, text }: Signals): boolean {
  if (code === 'ABORT_ERR') return true;

  const name = nameOf(err);
  if (name === 'AbortError' || name === 'TimeoutError') return true;

  const hint = asRecord(err)?.hint;
  if (typeof hint === 'string' && ABORT_HINT.test(hint)) return true;

  return FLATTENED_ABORT.test(text);
}

function nameOf(err: unknown): string {
  const name = asRecord(err)?.name;
  return typeof name === 'string' ? name : '';
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

// Cause chains can be circular.
function withCause(err: unknown, text: string): string {
  const parts = [text];
  let cause = asRecord(err)?.cause;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH && cause !== undefined && cause !== null; depth++) {
    const nested = describe(cause);
    if (nested && !parts.includes(nested)) parts.push(nested);
    cause = asRecord(cause)?.cause;
  }

  return parts.join('\n');
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
