import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';

import { rejectDemo } from '../rejectDemo';

describe('rejectDemo', () => {
  it('returns null for a real organizer', () => {
    expect(rejectDemo({ isDemo: false })).toBeNull();
  });

  it('returns null when isDemo is absent (a hand-built fixture)', () => {
    expect(rejectDemo({})).toBeNull();
  });

  it('403s a demo account with the default code', async () => {
    const res = rejectDemo({ isDemo: true });
    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(403);
    expect((await res!.json()).error).toBe('DEMO_ACCOUNT_BLOCKED');
  });

  it('403s a demo account with a custom code', async () => {
    const res = rejectDemo({ isDemo: true }, 'DEMO_NO_INVITES');
    expect((await res!.json()).error).toBe('DEMO_NO_INVITES');
  });
});
