import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { latestSrsNextSource } from '../../../ops/srsSource.mjs';

const dirs: string[] = [];

function makeMigrations(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'srs-source-test-'));
  dirs.push(dir);
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, name), text, 'utf8');
  }
  return dir;
}

function normalizedHash(sql: string): string {
  return createHash('sha256').update(sql.replace(/\s+/g, ' ').trim()).digest('hex');
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe('latestSrsNextSource', () => {
  it('extracts a plain $$ body', () => {
    const body = `CREATE OR REPLACE FUNCTION srs_next(p_interval real)
RETURNS real
LANGUAGE sql
AS $$
  SELECT p_interval;
$$;`;
    const dir = makeMigrations({ '20260101000000_base.sql': body });

    const result = latestSrsNextSource(dir);

    expect(result.file).toBe('20260101000000_base.sql');
    expect(result.hash).toBe(normalizedHash(body));
  });

  it('extracts a $function$ body with no trailing semicolon (pg_get_functiondef form)', () => {
    const body = `CREATE OR REPLACE FUNCTION public.srs_next(p_interval real)
 RETURNS real
 LANGUAGE sql
AS $function$
  SELECT p_interval;
$function$`;
    const dir = makeMigrations({ '20260101000000_base.sql': body });

    const result = latestSrsNextSource(dir);

    expect(result.file).toBe('20260101000000_base.sql');
    expect(result.hash).toBe(normalizedHash(body));
  });

  it('extracts a quoted "public"."srs_next" definition', () => {
    const body = `CREATE OR REPLACE FUNCTION "public"."srs_next"(p_interval real)
RETURNS real
LANGUAGE sql
AS $$
  SELECT p_interval;
$$;`;
    const dir = makeMigrations({ '20260101000000_base.sql': body });

    const result = latestSrsNextSource(dir);

    expect(result.file).toBe('20260101000000_base.sql');
    expect(result.hash).toBe(normalizedHash(body));
  });

  it('stops at the closing $$ and never hashes a following function', () => {
    const srsNextBody = `CREATE OR REPLACE FUNCTION srs_next(p_interval real)
RETURNS real
LANGUAGE sql
AS $$
  SELECT p_interval;
$$`;
    const trailer = ` LANGUAGE sql;

CREATE OR REPLACE FUNCTION increment_card_progress(p_card_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  SELECT p_card_id;
$$;`;
    const dir = makeMigrations({ '20260101000000_base.sql': srsNextBody + trailer });

    const result = latestSrsNextSource(dir);

    expect(result.sql).not.toContain('increment_card_progress');
    expect(result.hash).toBe(normalizedHash(srsNextBody));
  });

  it('throws when the newest file touches srs_next but only drops it', () => {
    const dropOnly = `DROP FUNCTION IF EXISTS srs_next(real, real, boolean);`;
    const createOlder = `CREATE OR REPLACE FUNCTION srs_next(p_interval real)
RETURNS real
LANGUAGE sql
AS $$
  SELECT p_interval;
$$;`;
    const dir = makeMigrations({
      '20260101000000_create.sql': createOlder,
      '20260102000000_drop.sql': dropOnly,
    });

    expect(() => latestSrsNextSource(dir)).toThrow(
      "srs_next touched in 20260102000000_drop.sql but couldn't be parsed",
    );
  });

  it('ignores a plain call to srs_next( and falls back to the older defining migration', () => {
    const createOlder = `CREATE OR REPLACE FUNCTION srs_next(p_interval real)
RETURNS real
LANGUAGE sql
AS $$
  SELECT p_interval;
$$;`;
    const callerOnly = `CREATE OR REPLACE FUNCTION increment_card_progress(p_card_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  SELECT (srs_next(0, 2.5, true)).interval_days;
$$;`;
    const dir = makeMigrations({
      '20260101000000_create.sql': createOlder,
      '20260102000000_caller.sql': callerOnly,
    });

    const result = latestSrsNextSource(dir);

    expect(result.file).toBe('20260101000000_create.sql');
    expect(result.hash).toBe(normalizedHash(createOlder));
  });
});
