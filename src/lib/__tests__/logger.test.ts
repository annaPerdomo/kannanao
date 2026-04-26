import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../logger';

describe('logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logger.info calls console.log', () => {
    logger.info('test message');
    expect(logSpy).toHaveBeenCalledOnce();
  });

  it('logger.warn calls console.warn', () => {
    logger.warn('warning');
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('logger.error calls console.error', () => {
    logger.error('error');
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('includes context in output', () => {
    logger.info('request', { route: '/api/test', durationMs: 42 });
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('request');
    expect(output).toContain('/api/test');
  });

  it('works without context', () => {
    logger.info('simple message');
    expect(logSpy).toHaveBeenCalledOnce();
  });
});
