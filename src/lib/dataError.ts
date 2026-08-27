/**
 * On 2026-08-26 PostgREST was down for six hours while Auth stayed healthy, so
 * every read failed with a 503 and the app rendered "no decks yet" instead of an
 * outage. `kind` is what makes those two cases distinguishable inside a catch.
 *
 * Keep this dependency-free: both the client data path and the API routes import
 * it, and reaching for `supabase.ts` or `apiCache.ts` would create a cycle.
 */

export type DataErrorKind =
  | 'offline' // request never reached a server (fetch rejected, DNS, airplane mode)
  | 'upstream' // server reached but broken: 502/503/504, gateway connect failure
  | 'auth' // 401/403, expired or rejected session
  | 'notFound' // 404, or a single-row query that found nothing
  | 'unknown'; // anything unclassified — never silently treated as empty

interface DataErrorOptions {
  status?: number;
  code?: string;
  cause?: unknown;
}

export class DataError extends Error {
  readonly kind: DataErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly cause?: unknown;

  constructor(kind: DataErrorKind, message: string, options: DataErrorOptions = {}) {
    super(message);
    this.name = 'DataError';
    this.kind = kind;
    this.status = options.status;
    this.code = options.code;
    this.cause = options.cause;
  }
}

/**
 * The gateway's connect-failure body, captured live during the outage. Matching
 * the prose, not the trailing `111` — that is an errno, not a stable string.
 */
const UPSTREAM_BODY = /upstream connect error|delayed connect error/i;

const OFFLINE_MESSAGE =
  /failed to fetch|fetch failed|networkerror|network request failed|load failed|connection refused|err_(internet_disconnected|network_changed|connection_refused|name_not_resolved)/i;

/** PostgREST's "no rows returned" from a `.single()` query — an absence, not an outage. */
const NO_ROWS_CODE = 'PGRST116';

const UPSTREAM_STATUSES = new Set([502, 503, 504]);
const AUTH_STATUSES = new Set([401, 403]);

export function isDataError(err: unknown): err is DataError {
  return err instanceof DataError;
}

export function isRetryable(err: DataError): boolean {
  return err.kind === 'offline' || err.kind === 'upstream';
}

/**
 * Total: every input yields a `DataError` and this never throws, because it is
 * called from `catch` blocks where the thrown shape is genuinely unknown.
 */
export function toDataError(err: unknown, ctx?: { status?: number }): DataError {
  if (isDataError(err)) return err;

  const status = ctx?.status ?? statusOf(err);
  const code = codeOf(err);
  const text = describe(err);
  const kind = classify({ err, status, code, text });

  return new DataError(kind, text.trim() || defaultMessage(kind, status), {
    status,
    code,
    cause: err,
  });
}

/**
 * Classify a failed `Response`, reading its body first. The outage answered with
 * `content-type: text/plain`, so a `.json()` parse failure on a 503 must still
 * come back as `upstream` rather than `unknown`.
 */
export async function dataErrorFromResponse(res: Response): Promise<DataError> {
  let body = '';
  try {
    body = await res.text();
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

function classify({ err, status, code, text }: Signals): DataErrorKind {
  // Body before status: the gateway returned the Envoy connect-failure body under
  // more than one status, and the body is the more reliable signal of the two.
  if (UPSTREAM_BODY.test(text)) return 'upstream';

  if (code === NO_ROWS_CODE) return 'notFound';

  if (status !== undefined) {
    if (UPSTREAM_STATUSES.has(status)) return 'upstream';
    if (AUTH_STATUSES.has(status)) return 'auth';
    if (status === 404) return 'notFound';
    return 'unknown';
  }

  if (code === undefined && isOffline(err, text)) return 'offline';

  return 'unknown';
}

// A bare TypeError is not enough to claim offline: "x.map is not a function" is
// a bug, and telling a learner to check their wifi sends them chasing that.
function isOffline(err: unknown, text: string): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return err instanceof TypeError && OFFLINE_MESSAGE.test(text);
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

/** Never stringifies the input — it may be circular, and this must not throw. */
function describe(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err === null) return 'null';
  if (err === undefined) return 'undefined';
  if (isResponse(err))
    return err.statusText ? `HTTP ${err.status} ${err.statusText}` : `HTTP ${err.status}`;
  if (err instanceof Error) return err.message || err.name;

  const rec = asRecord(err);
  if (rec)
    return firstString(rec, ['message', 'details', 'error', 'error_description', 'hint']) ?? '';

  return String(err);
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
