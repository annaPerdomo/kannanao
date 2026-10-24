import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20261023120000_demo_account_guards.sql'),
  'utf8',
);

describe('demo_account_guards migration', () => {
  it('defines both demo-check functions', () => {
    expect(sql).toMatch(/create or replace function public\.is_demo_session\(\)/);
    expect(sql).toMatch(/create or replace function public\.is_demo_user\(uid uuid\)/);
  });

  it('defines the profiles guard trigger and its function', () => {
    expect(sql).toMatch(/create or replace function public\.guard_demo_profile_changes\(\)/);
    expect(sql).toMatch(/create trigger guard_demo_profile_changes/);
  });

  it('recreates every policy this migration must patch', () => {
    const policies = [
      'invite_codes: organizer insert',
      'assignments: organizer all',
      'encouragements: organizer all',
      'Users can insert messages they send',
      'deck_shares: owner insert',
    ];
    for (const name of policies) {
      expect(sql, `missing drop for "${name}"`).toMatch(
        new RegExp(`drop policy if exists "${name}"`, 'i'),
      );
      expect(sql, `missing create for "${name}"`).toMatch(
        new RegExp(`create policy\\s+"${name}"`, 'i'),
      );
    }
  });

  it('is idempotent: every function is create or replace, every trigger drop-then-create', () => {
    expect(sql).not.toMatch(/create function/i);
    expect(sql).toMatch(/drop trigger if exists guard_demo_profile_changes/);
  });
});
