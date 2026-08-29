import { afterEach, describe, expect, it } from 'vitest';

import {
  DataError,
  dataErrorFromResponse,
  isDataError,
  isRetryable,
  toDataError,
} from '@/lib/dataError';

// The 2026-08-26 gateway body: text/plain, no JSON envelope.
const ENVOY_BODY =
  'upstream connect error or disconnect/reset before headers. retried and the latest reset reason: remote connection failure, transport failure reason: delayed connect error: 111';

const postgrestError = (code: string, message = 'boom') => ({
  message,
  details: null,
  hint: null,
  code,
});

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
}

afterEach(() => {
  setOnLine(true);
});

describe('classification table', () => {
  it('treats a fetch TypeError as offline', () => {
    for (const message of [
      'Failed to fetch',
      'NetworkError when attempting to fetch resource.',
      'Load failed',
      'fetch failed',
    ]) {
      expect(toDataError(new TypeError(message)).kind).toBe('offline');
    }
  });

  it('treats any statusless failure as offline while the browser reports no connection', () => {
    setOnLine(false);
    expect(toDataError(new Error('something went wrong')).kind).toBe('offline');
  });

  it('does not call a plain programming TypeError offline', () => {
    expect(toDataError(new TypeError('x.map is not a function')).kind).toBe('unknown');
  });

  it.each([500, 502, 503, 504, 599])('maps HTTP %i to upstream', (status) => {
    expect(toDataError(new Error('gateway'), { status }).kind).toBe('upstream');
  });

  it('maps the Envoy connect-failure body to upstream', () => {
    expect(toDataError(new Error(ENVOY_BODY)).kind).toBe('upstream');
    expect(toDataError('delayed connect error: 111').kind).toBe('upstream');
  });

  it.each([401, 403])('maps HTTP %i to auth', (status) => {
    expect(toDataError(new Error('nope'), { status }).kind).toBe('auth');
  });

  it('maps a bare HTTP 404 to notFound', () => {
    expect(toDataError(new Error('missing'), { status: 404 }).kind).toBe('notFound');
  });

  it('maps PGRST116 to notFound, because a .single() miss is an absence, not an outage', () => {
    const err = toDataError(
      postgrestError('PGRST116', 'JSON object requested, multiple (or no) rows returned'),
    );
    expect(err.kind).toBe('notFound');
    expect(err.code).toBe('PGRST116');
  });

  it('maps a schema-cache miss to upstream rather than to an absence', () => {
    for (const code of ['PGRST205', 'PGRST202']) {
      const err = toDataError(postgrestError(code, 'Could not find it in the schema cache'), {
        status: 404,
      });
      expect(err.kind).toBe('upstream');
      expect(err.code).toBe(code);
      expect(isRetryable(err)).toBe(true);
    }
  });

  it('maps a dead-database PostgREST code to upstream', () => {
    expect(toDataError({ code: '57P03', message: 'the database system is starting up' }).kind).toBe(
      'upstream',
    );
    expect(toDataError({ code: 'PGRST000', message: 'Database connection error' }).kind).toBe(
      'upstream',
    );
  });

  it('still calls a 404 an absence when the backend sent an unrelated code with it', () => {
    expect(toDataError({ message: 'nope', code: 'PGRST100' }, { status: 404 }).kind).toBe(
      'notFound',
    );
  });

  it('leaves any other PostgrestError unknown but keeps its code', () => {
    const err = toDataError(postgrestError('23505', 'duplicate key value violates a constraint'));
    expect(err.kind).toBe('unknown');
    expect(err.code).toBe('23505');
    expect(err.message).toBe('duplicate key value violates a constraint');
  });

  it('leaves anything else unknown', () => {
    expect(toDataError(new Error('boom')).kind).toBe('unknown');
    expect(toDataError({ nope: true }).kind).toBe('unknown');
    expect(toDataError(new Error('bad request'), { status: 400 }).kind).toBe('unknown');
  });
});

describe('shapes supabase-js actually produces', () => {
  // postgrest-js does not throw when fetch rejects: it resolves with this.
  const fetchRejected = {
    message: 'TypeError: Failed to fetch',
    details: 'TypeError: Failed to fetch\n\nCaused by: Error: getaddrinfo ENOTFOUND',
    hint: '',
    code: '',
  };

  const aborted = {
    message: 'AbortError: The user aborted a request.',
    details: 'AbortError: The user aborted a request.',
    hint: 'Request was aborted (timeout or manual cancellation)',
    code: '',
  };

  it('still calls a rejected fetch offline once the TypeError has been flattened away', () => {
    expect(toDataError(fetchRejected).kind).toBe('offline');
  });

  it('ignores the status: 0 sentinel instead of reading it as an answer from a server', () => {
    const err = toDataError(fetchRejected, { status: 0 });
    expect(err.status).toBeUndefined();
    expect(err.kind).toBe('offline');
    expect(isRetryable(err)).toBe(true);
  });

  it('calls an aborted or timed-out request upstream, so it stays retryable', () => {
    for (const input of [aborted, { ...aborted, message: 'TimeoutError: signal timed out' }]) {
      const err = toDataError(input, { status: 0 });
      expect(err.kind).toBe('upstream');
      expect(isRetryable(err)).toBe(true);
    }
  });

  it('classifies a raw abort or timeout that carries no status at all', () => {
    for (const name of ['AbortError', 'TimeoutError']) {
      const err = new Error('The operation was aborted.');
      err.name = name;
      expect(toDataError(err).kind).toBe('upstream');
    }
    expect(toDataError({ message: 'cancelled', code: 'ABORT_ERR' }).kind).toBe('upstream');
  });

  // auth-js rethrows a rejected fetch as its own class, with `status: 0`.
  const authFetchError = (message: string, status = 0) =>
    Object.assign(new Error(message), {
      name: 'AuthRetryableFetchError',
      __isAuthError: true,
      status,
    });

  it('calls a dropped auth request offline even though the TypeError is gone', () => {
    for (const message of ['Failed to fetch', 'fetch failed', 'Load failed']) {
      const err = toDataError(authFetchError(message));
      expect(err.kind).toBe('offline');
      expect(isRetryable(err)).toBe(true);
    }
  });

  it('calls the same class upstream when the auth server did answer', () => {
    expect(toDataError(authFetchError('Service temporarily unavailable', 503)).kind).toBe(
      'upstream',
    );
  });

  it('recognises the functions-js and node-fetch spellings of the same failure', () => {
    for (const name of ['FunctionsFetchError', 'FetchError']) {
      const err = Object.assign(new Error('Failed to fetch'), { name });
      expect(toDataError(err).kind).toBe('offline');
    }
  });

  it('does not call a non-network failure offline just because it ends in FetchError', () => {
    const err = Object.assign(new Error('invalid JWT'), { name: 'AuthRetryableFetchError' });
    expect(toDataError(err).kind).toBe('unknown');
  });

  it('reads a connect errno as offline, not as a PostgREST code', () => {
    for (const code of ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH']) {
      const err = Object.assign(new Error('fetch failed'), { name: 'FetchError', code });
      const result = toDataError(err);
      expect(result.kind).toBe('offline');
      expect(isRetryable(result)).toBe(true);
    }
  });

  it('does not treat every errno-carrying failure as offline', () => {
    const err = Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });
    expect(toDataError(err).kind).toBe('unknown');
  });

  it('calls a connect timeout offline', () => {
    expect(toDataError({ code: 'ETIMEDOUT' }).kind).toBe('offline');
  });

  it('calls any statusless, codeless-match failure offline once the browser is offline', () => {
    setOnLine(false);
    expect(toDataError({ code: 'SOME_UNRECOGNIZED_CODE', message: 'boom' }).kind).toBe('offline');
  });

  it('reads a non-JSON gateway body handed back as a bare message', () => {
    // An unparseable 503 body arrives as `{ message: <body> }`, status separate.
    expect(toDataError({ message: ENVOY_BODY }, { status: 503 }).kind).toBe('upstream');
  });
});

describe('classification order', () => {
  it('reads the body before the status line', () => {
    expect(toDataError(new Error(ENVOY_BODY), { status: 400 }).kind).toBe('upstream');
    expect(toDataError(new Error(ENVOY_BODY), { status: 404 }).kind).toBe('upstream');
    expect(toDataError(new Error(ENVOY_BODY), { status: 401 }).kind).toBe('upstream');
  });

  it('reads the gateway prose out of the cause of a wrapper error', () => {
    const err = toDataError(new Error('load decks failed', { cause: new Error(ENVOY_BODY) }));
    expect(err.kind).toBe('upstream');
    expect(err.message).toBe('load decks failed');
  });

  it('keeps reading down a twice-wrapped cause chain', () => {
    const err = toDataError(
      new Error('load decks failed', {
        cause: new Error('Request failed (503)', { cause: new Error(ENVOY_BODY) }),
      }),
    );
    expect(err.kind).toBe('upstream');
    expect(err.message).toBe('load decks failed');
  });

  it('matches the Envoy prose case-insensitively and not the bare errno', () => {
    expect(toDataError('UPSTREAM CONNECT ERROR or disconnect/reset').kind).toBe('upstream');
    expect(toDataError('errno 111').kind).toBe('unknown');
  });

  it('prefers an explicit ctx status over one carried on the error', () => {
    expect(toDataError({ message: 'x', status: 404 }, { status: 503 }).kind).toBe('upstream');
  });

  it('falls back to the status on the error when ctx carries a non-status', () => {
    expect(toDataError({ message: 'x', status: 503 }, { status: 0 }).kind).toBe('upstream');
  });

  it('does not report offline when a server actually answered', () => {
    setOnLine(false);
    expect(toDataError(new TypeError('Failed to fetch'), { status: 503 }).kind).toBe('upstream');
  });
});

describe('toDataError is total', () => {
  const circular: Record<string, unknown> = { message: 'circular boom' };
  circular.self = circular;
  const namelessCircular: Record<string, unknown> = {};
  namelessCircular.self = namelessCircular;

  const throwingGetter = (key: string) =>
    Object.defineProperty({ message: 'boom' }, key, {
      get() {
        throw new Error(`reading ${key} exploded`);
      },
    });

  const throwingCause = () =>
    Object.defineProperty(new Error('wrapper'), 'cause', {
      get() {
        throw new Error('reading cause exploded');
      },
    });

  const throwingProxy = () =>
    new Proxy(
      {},
      {
        get() {
          throw new Error('proxy trap');
        },
      },
    );

  const inputs: [string, unknown][] = [
    ['undefined', undefined],
    ['null', null],
    ['a string', 'plain text failure'],
    ['an empty string', ''],
    ['a number', 500],
    ['a boolean', false],
    ['a symbol', Symbol('nope')],
    ['a plain object', { nope: true }],
    ['an empty object', {}],
    ['an array', [1, 2, 3]],
    ['a function', () => undefined],
    ['an Error', new Error('boom')],
    ['an Error with no message', new Error('')],
    ['a PostgrestError', postgrestError('PGRST301')],
    ['a Response', new Response('body', { status: 503 })],
    ['a circular object', circular],
    ['a circular object with no message', namelessCircular],
    ['an object with a throwing message getter', throwingGetter('message')],
    ['an object with a throwing status getter', throwingGetter('status')],
    ['an object with a throwing code getter', throwingGetter('code')],
    ['an Error with a throwing cause getter', throwingCause()],
    ['a proxy that throws on every read', throwingProxy()],
  ];

  it.each(inputs)('returns a DataError for %s', (_label, input) => {
    const err = toDataError(input);
    expect(err).toBeInstanceOf(DataError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('DataError');
    expect(typeof err.message).toBe('string');
    expect(err.message.length).toBeGreaterThan(0);
    expect(['offline', 'upstream', 'auth', 'notFound', 'unknown']).toContain(err.kind);
  });

  it.each(inputs)('preserves the original of %s on cause', (_label, input) => {
    expect(toDataError(input).cause).toBe(input);
  });

  it('keeps the original error object, not a stringified copy', () => {
    const original = postgrestError('PGRST205', 'Could not find the table');
    const err = toDataError(original);
    expect(err.cause).toBe(original);
    expect((err.cause as { hint: null }).hint).toBeNull();
  });

  it('leaves cause non-enumerable, so logging a circular failure does not throw', () => {
    const err = toDataError(circular);
    expect(err.cause).toBe(circular);
    expect(() => JSON.stringify(err)).not.toThrow();
    expect(JSON.parse(JSON.stringify(err))).not.toHaveProperty('cause');
  });

  it('does not serialise the raw upstream object into a log line', () => {
    const err = toDataError({
      message: 'duplicate key value violates a constraint',
      details: 'Key (email)=(kid@example.com) already exists.',
    });
    expect(JSON.stringify(err)).not.toContain('kid@example.com');
  });

  it('returns an existing DataError untouched so nested catches do not re-wrap', () => {
    const original = new DataError('upstream', ENVOY_BODY, { status: 503 });
    expect(toDataError(original)).toBe(original);
    expect(toDataError(original, { status: 401 }).kind).toBe('upstream');
  });
});

describe('status and code extraction', () => {
  it('reads a status off the error when no ctx is given', () => {
    expect(toDataError({ message: 'x', status: 503 }).kind).toBe('upstream');
    expect(toDataError({ message: 'x', statusCode: 403 }).kind).toBe('auth');
    expect(toDataError({ message: 'x', response: { status: 404 } }).kind).toBe('notFound');
    expect(toDataError(new Response('', { status: 401 })).kind).toBe('auth');
  });

  it('accepts a three-digit status that arrived as a string', () => {
    expect(toDataError({ message: 'x', status: '503' }).status).toBe(503);
    expect(toDataError({ message: 'x', status: '503' }).kind).toBe('upstream');
  });

  it('ignores a status field that is not an HTTP status', () => {
    expect(toDataError({ message: 'x', status: 'active' }).status).toBeUndefined();
    expect(toDataError({ message: 'x', status: 42 }).status).toBeUndefined();
    expect(toDataError({ message: 'x' }, { status: 0 }).status).toBeUndefined();
  });

  it('ignores a non-string or blank code', () => {
    expect(toDataError({ message: 'x', code: 23505 }).code).toBeUndefined();
    expect(toDataError({ message: 'x', code: '   ' }).code).toBeUndefined();
  });

  it('falls back to the error name when an Error carries no message', () => {
    expect(toDataError(new TypeError('')).message).toBe('TypeError');
  });

  it('uses the statusText of a Response when it has one', () => {
    expect(
      toDataError(new Response('', { status: 503, statusText: 'Service Unavailable' })).message,
    ).toBe('HTTP 503 Service Unavailable');
  });

  it('falls back through message, details and error for the developer message', () => {
    expect(toDataError({ details: 'Key is not present' }).message).toBe('Key is not present');
    expect(toDataError({ error: 'invalid_grant' }).message).toBe('invalid_grant');
  });

  it('labels a message-less failure with its kind and status', () => {
    expect(toDataError({}, { status: 503 }).message).toBe(
      'Data request failed (upstream, HTTP 503)',
    );
    expect(toDataError({}).message).toBe('Data request failed (unknown)');
  });
});

describe('dataErrorFromResponse', () => {
  it('classifies the real outage response: 503 with a text/plain Envoy body', async () => {
    const res = new Response(ENVOY_BODY, {
      status: 503,
      headers: { 'content-type': 'text/plain' },
    });
    const err = await dataErrorFromResponse(res);
    expect(err.kind).toBe('upstream');
    expect(err.status).toBe(503);
    expect(err.message).toContain('delayed connect error');
    expect(err.cause).toBe(res);
  });

  it('stays upstream when a non-JSON body fails to parse', async () => {
    const err = await dataErrorFromResponse(
      new Response('<html>502 Bad Gateway</html>', { status: 502 }),
    );
    expect(err.kind).toBe('upstream');
    expect(err.message).toBe('<html>502 Bad Gateway</html>');
  });

  it('maps a 500 from one of our own API routes to upstream', async () => {
    // Our routes catch a dead database and answer 500; the 503 never gets out.
    const res = new Response(JSON.stringify({ error: 'Failed to load decks' }), { status: 500 });
    const err = await dataErrorFromResponse(res);
    expect(err.kind).toBe('upstream');
    expect(err.message).toBe('Failed to load decks');
  });

  it('pulls message and code out of a JSON error envelope', async () => {
    const res = new Response(JSON.stringify(postgrestError('PGRST116', 'no rows')), {
      status: 406,
      headers: { 'content-type': 'application/json' },
    });
    const err = await dataErrorFromResponse(res);
    expect(err.kind).toBe('notFound');
    expect(err.code).toBe('PGRST116');
    expect(err.message).toBe('no rows');
  });

  it('keeps the raw body, and the kind, when a 404 envelope carries only a code', async () => {
    const res = new Response('{"code":"PGRST202"}', { status: 404 });
    const err = await dataErrorFromResponse(res);
    expect(err.kind).toBe('upstream');
    expect(err.code).toBe('PGRST202');
    expect(err.message).toBe('{"code":"PGRST202"}');
  });

  it('stays upstream when a body that looks like JSON is truncated mid-parse', async () => {
    const err = await dataErrorFromResponse(new Response('{"message":"gateway t', { status: 503 }));
    expect(err.kind).toBe('upstream');
    expect(err.code).toBeUndefined();
    expect(err.message).toBe('{"message":"gateway t');
  });

  it('consumes the response body directly, since discarding it is the only caller', async () => {
    const res = new Response('{"error":"nope"}', { status: 500 });
    await dataErrorFromResponse(res);
    expect(res.bodyUsed).toBe(true);
    await expect(res.json()).rejects.toThrow();
  });

  it('flushes a trailing multi-byte character split across chunks', async () => {
    const bytes = new TextEncoder().encode('emoji: 😀');
    const splitAt = bytes.length - 2; // splits the 4-byte emoji in half
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, splitAt));
        controller.enqueue(bytes.slice(splitAt));
        controller.close();
      },
    });

    const err = await dataErrorFromResponse(new Response(stream, { status: 500 }));
    expect(err.message).toBe('emoji: 😀');
  });

  it('stops pulling a runaway body instead of buffering megabytes of proxy HTML', async () => {
    const chunk = new TextEncoder().encode('x'.repeat(1024));
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        if (pulled > 3000) return controller.close();
        controller.enqueue(chunk);
      },
    });

    const err = await dataErrorFromResponse(new Response(stream, { status: 502 }));
    expect(err.kind).toBe('upstream');
    expect(err.message.length).toBeLessThanOrEqual(2048);
    expect(pulled).toBeLessThan(10);
  });

  it('falls back to text() for a Response whose body is not a stream', async () => {
    const bodyless = {
      status: 500,
      body: null,
      text: () => Promise.resolve('{"error":"nope"}'),
    };
    const err = await dataErrorFromResponse(bodyless as unknown as Response);
    expect(err.kind).toBe('upstream');
    expect(err.message).toBe('nope');
  });

  it('survives an empty body and an unreadable body', async () => {
    const empty = await dataErrorFromResponse(new Response('', { status: 404 }));
    expect(empty.kind).toBe('notFound');
    expect(empty.message).toBe('Data request failed (notFound, HTTP 404)');

    const unreadable = {
      status: 503,
      text: () => Promise.reject(new Error('already consumed')),
    };
    const err = await dataErrorFromResponse(unreadable as unknown as Response);
    expect(err.kind).toBe('upstream');
  });
});

describe('isRetryable', () => {
  it('is true only for failures that might clear on their own', () => {
    expect(isRetryable(new DataError('offline', 'x'))).toBe(true);
    expect(isRetryable(new DataError('upstream', 'x'))).toBe(true);
    expect(isRetryable(new DataError('auth', 'x'))).toBe(false);
    expect(isRetryable(new DataError('notFound', 'x'))).toBe(false);
    expect(isRetryable(new DataError('unknown', 'x'))).toBe(false);
  });

  it('retries a throttle or a request timeout without calling either an outage', () => {
    const limited = toDataError(new Error('Too Many Requests'), { status: 429 });
    expect(limited.kind).toBe('unknown');
    expect(isRetryable(limited)).toBe(true);
    expect(isRetryable(toDataError(new Error('timeout'), { status: 408 }))).toBe(true);
    expect(isRetryable(toDataError(new Error('bad'), { status: 400 }))).toBe(false);
  });
});

describe('isDataError', () => {
  it('narrows only real DataErrors', () => {
    expect(isDataError(new DataError('unknown', 'x'))).toBe(true);
    expect(isDataError(toDataError('x'))).toBe(true);
    expect(isDataError(new Error('x'))).toBe(false);
    expect(isDataError({ kind: 'upstream', message: 'x' })).toBe(false);
    expect(isDataError(null)).toBe(false);
    expect(isDataError(undefined)).toBe(false);
  });
});
