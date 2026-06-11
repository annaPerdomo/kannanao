import { describe, expect, it } from 'vitest';

import { isChunkLoadError } from '../UpdatePrompt';

describe('isChunkLoadError', () => {
  it('matches chunk load failure messages from a stale cache', () => {
    expect(isChunkLoadError('ChunkLoadError: Loading chunk 42 failed')).toBe(true);
    expect(isChunkLoadError('Loading chunk app-pages-internals failed')).toBe(true);
    expect(isChunkLoadError('Loading CSS chunk 7 failed')).toBe(true);
    expect(isChunkLoadError('Failed to fetch dynamically imported module: /_next/...')).toBe(true);
    expect(isChunkLoadError('error loading dynamically imported module')).toBe(true);
  });

  it('ignores unrelated runtime errors', () => {
    expect(isChunkLoadError('TypeError: x is not a function')).toBe(false);
    expect(isChunkLoadError('Network request failed')).toBe(false);
    expect(isChunkLoadError('')).toBe(false);
  });
});
