import { describe, expect, it } from 'vitest';

import { errorMessage } from '@/lib/errorMessage';

describe('errorMessage', () => {
  it('uses an Error message', () => {
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('reads a Supabase PostgrestError, which is a plain object and not an Error', () => {
    // The exact shape that made a schema mismatch look like "nothing happened".
    const postgrestError = {
      message: "Could not find the 'romaji' column of 'cards' in the schema cache",
      details: null,
      hint: null,
      code: 'PGRST204',
    };
    expect(errorMessage(postgrestError, 'Failed to save')).toBe(
      "Could not find the 'romaji' column of 'cards' in the schema cache",
    );
  });

  it('falls back to details when there is no message', () => {
    expect(errorMessage({ message: '', details: 'Key is not present' }, 'fallback')).toBe(
      'Key is not present',
    );
  });

  it('accepts a thrown string', () => {
    expect(errorMessage('offline', 'fallback')).toBe('offline');
  });

  it('uses the fallback for null, undefined, and empty shapes', () => {
    expect(errorMessage(null, 'fallback')).toBe('fallback');
    expect(errorMessage(undefined, 'fallback')).toBe('fallback');
    expect(errorMessage({}, 'fallback')).toBe('fallback');
    expect(errorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(errorMessage({ message: '   ' }, 'fallback')).toBe('fallback');
  });
});
