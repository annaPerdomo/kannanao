#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { latestSrsNextSource } from './srsSource.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const FIXTURE_PATH = join(ROOT, 'src', 'lib', '__tests__', 'fixtures', 'srsVectors.json');

const INTERVALS = [0, 0.5, 1, 2, 3, 7, 20, 60];
const EASES = [1.3, 1.5, 2.0, 2.5, 2.8];
const CORRECTS = [true, false];
const ELAPSED_DAYS = [null, 0.01, 0.4, 0.6, 1, 2, 5, 10, 90];

// srs_next's branching never keys on ease, so cycle one ease value per combo
// instead of a full cross product.
function buildVectors() {
  const vectors = [];
  let i = 0;
  for (const interval of INTERVALS) {
    for (const elapsedDays of ELAPSED_DAYS) {
      for (const correct of CORRECTS) {
        const ease = EASES[i % EASES.length];
        vectors.push({ idx: i, interval, ease, correct, elapsedDays });
        i += 1;
      }
    }
  }
  return vectors;
}

function sqlLiteral(value) {
  if (value === null) return 'NULL::real';
  return `${value}::real`;
}

function buildQuery(vectors) {
  const rows = vectors
    .map(
      (v) =>
        `(${v.idx}, ${sqlLiteral(v.interval)}, ${sqlLiteral(v.ease)}, ${v.correct}, ${sqlLiteral(v.elapsedDays)})`,
    )
    .join(',\n    ');

  return `WITH v(idx, interval, ease, correct, elapsed) AS (
  VALUES
    ${rows}
)
SELECT
  v.idx,
  v.interval,
  v.ease,
  v.correct,
  v.elapsed AS elapsed_days,
  s.interval_days,
  s.ease AS next_ease,
  extract(epoch from (s.next_review_at - now())) AS next_in_seconds
FROM v
CROSS JOIN LATERAL srs_next(
  v.interval,
  v.ease,
  v.correct,
  CASE WHEN v.elapsed IS NULL THEN NULL ELSE now() - make_interval(secs => v.elapsed * 86400) END
) AS s
ORDER BY v.idx;
`;
}

function runQuery(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'srs-vectors-'));
  const sqlPath = join(dir, 'vectors.sql');
  writeFileSync(sqlPath, sql, 'utf8');

  let stdout;
  try {
    stdout = execFileSync(
      'supabase',
      ['db', 'query', '--linked', '--file', sqlPath, '-o', 'json', '--agent=yes'],
      { cwd: ROOT, encoding: 'utf8' },
    );
  } catch (err) {
    throw new Error(
      `Could not query the linked Supabase project. Is the CLI logged in and linked?\n${err.message}`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error(
      `Could not parse supabase CLI output as JSON. First 200 chars: ${stdout.slice(0, 200)}`,
    );
  }
  return Array.isArray(parsed) ? parsed : parsed.rows;
}

function main() {
  const source = latestSrsNextSource(MIGRATIONS_DIR);
  const vectors = buildVectors();
  const query = buildQuery(vectors);

  let rows;
  try {
    rows = runQuery(query);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (!Array.isArray(rows) || rows.length !== vectors.length) {
    console.error(
      `Expected ${vectors.length} rows, got ${Array.isArray(rows) ? rows.length : 'none'}.`,
    );
    process.exit(1);
  }

  const byIdx = new Map(rows.map((row) => [Number(row.idx), row]));
  const fixture = {
    source: source.file,
    sqlHash: source.hash,
    generatedAt: new Date().toISOString(),
    vectors: vectors.map((v) => {
      const row = byIdx.get(v.idx);
      if (!row) throw new Error(`Missing SQL result for vector ${v.idx}`);
      return {
        interval: v.interval,
        ease: v.ease,
        correct: v.correct,
        elapsedDays: v.elapsedDays,
        expected: {
          intervalDays: Number(row.interval_days),
          ease: Number(row.next_ease),
          nextInSeconds: Number(row.next_in_seconds),
        },
      };
    }),
  };

  writeFileSync(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote ${fixture.vectors.length} vectors to ${FIXTURE_PATH} (source: ${source.file}).`,
  );
}

main();
