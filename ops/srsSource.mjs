import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TARGET_RE =
  /\b(?:CREATE(?:\s+OR\s+REPLACE)?|DROP)\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(?:"?public"?\.)?"?srs_next"?\b/i;
const DEFINITION_RE =
  /CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+(?:"?public"?\.)?"?srs_next"?\s*\([\s\S]*?(\$\w*\$)[\s\S]*?\1\s*;?/i;

export function latestSrsNextSource(migrationsDir) {
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .reverse();

  for (const file of files) {
    const text = readFileSync(join(migrationsDir, file), 'utf8');
    if (!TARGET_RE.test(text)) continue;

    const match = DEFINITION_RE.exec(text);
    if (!match) throw new Error(`srs_next touched in ${file} but couldn't be parsed`);

    const sql = match[0].replace(/\s+/g, ' ').trim();
    const hash = createHash('sha256').update(sql).digest('hex');
    return { file, sql, hash };
  }

  throw new Error(`No migration in ${migrationsDir} defines srs_next`);
}
