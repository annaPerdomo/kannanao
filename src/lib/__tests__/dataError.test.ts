import { afterEach, describe, expect, it } from 'vitest';

import {
  DataError,
  dataErrorFromResponse,
  isDataError,
  isRetryable,
  toDataError,
} from '@/lib/dataError';

// The gateway body reproduced with plain curl during the 2026-08-26 outage.
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
    // "undefined is not a function" is a bug, and telling a learner to check
    // their wifi would send them chasing the wrong thing.
    expect(toDataError(new TypeError('x.map is not a function')).kind).toBe('unknown');
  });

  it.each([502, 503, 504])('maps HTTP %i to upstream', (status) => {
    expect(toDataError(new Error('gateway'), { status }).kind).toBe('upstream');
  });

  it('maps the Envoy connect-failure body to upstream', () => {
    expect(toDataError(new Error(ENVOY_BODY)).kind).toBe('upstream');
    expect(toDataError('delayed connect error: 111').kind).toBe('upstream');
  });

  it.each([401, 403])('maps HTTP %i to auth', (status) => {
    expect(toDataError(new Error('nope'), { status }).kind).toBe('auth');
  });

  it('maps HTTP 404 to notFound', () => {
    expect(toDataError(new Error('missing'), { status: 404 }).kind).toBe('notFound');
  });

  it('maps PGRST116 to notFound, because a .single() miss is an absence, not an outage', () => {
    const err = toDataError(
      postgrestError('PGRST116', 'JSON object requested, multiple (or no) rows returned'),
    );
    expect(err.kind).toBe('notFound');
    expect(err.code).toBe('PGRST116');
  });

  it('leaves any other PostgrestError unknown but keeps its code', () => {
    const err = toDataError(postgrestError('PGRST205', 'Could not find the table'));
    expect(err.kind).toBe('unknown');
    expect(err.code).toBe('PGRST205');
    expect(err.message).toBe('Could not find the table');
  });

  it('leaves anything else unknown', () => {
    expect(toDataError(new Error('boom')).kind).toBe('unknown');
    expect(toDataError({ nope: true }).kind).toBe('unknown');
    expect(toDataError(new Error('server error'), { status: 500 }).kind).toBe('unknown');
  });
});

describe('classification order', () => {
  it('reads the body before the status line', () => {
    // A 500 carrying the Envoy body is still an upstream failure. Reverse this
    // and a gateway that swaps its status code goes back to looking like a bug.
    expect(toDataError(new Error(ENVOY_BODY), { status: 500 }).kind).toBe('upstream');
    expect(toDataError(new Error(ENVOY_BODY), { status: 404 }).kind).toBe('upstream');
    expect(toDataError(new Error(ENVOY_BODY), { status: 401 }).kind).toBe('upstream');
  });

  it('matches the Envoy prose case-insensitively and not the bare errno', () => {
    expect(toDataError('UPSTREAM CONNECT ERROR or disconnect/reset').kind).toBe('upstream');
    expect(toDataError('errno 111').kind).toBe('unknown');
  });

  it('prefers an explicit ctx status over one carried on the error', () => {
    expect(toDataError({ message: 'x', status: 404 }, { status: 503 }).kind).toBe('upstream');
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

  it('keeps the raw body when a JSON envelope carries no recognisable message', async () => {
    const res = new Response('{"code":"PGRST202"}', { status: 404 });
    const err = await dataErrorFromResponse(res);
    expect(err.kind).toBe('notFound');
    expect(err.code).toBe('PGRST202');
    expect(err.message).toBe('{"code":"PGRST202"}');
  });

  it('stays upstream when a body that looks like JSON is truncated mid-parse', async () => {
    const err = await dataErrorFromResponse(new Response('{"message":"gateway t', { status: 503 }));
    expect(err.kind).toBe('upstream');
    expect(err.code).toBeUndefined();
    expect(err.message).toBe('{"message":"gateway t');
  });

  it('survives an empty body and an unreadable body', async () => {
    const empty = await dataErrorFromResponse(new Response('', { status: 404 }));
    expect(empty.kind).toBe('notFound');
    expect(empty.message).toBe('Data request failed (notFound, HTTP 404)');

    const unreadable = { status: 503, text: () => Promise.reject(new Error('already consumed')) };
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
