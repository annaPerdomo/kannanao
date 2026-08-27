#!/usr/bin/env node
// Mirrors the Supabase Storage bucket to disk. pg_dump covers Postgres only;
// every card image, chat photo and chat video lives in Storage and is lost without this.
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const BUCKET = process.env.BACKUP_BUCKET || 'card-images';
const PAGE = 1000;

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function loadDotEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const { readFile } = await import('node:fs/promises');
    const text = await readFile(new URL('../../.env', import.meta.url), 'utf8');
    for (const line of text.split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  } catch {
    /* no .env: rely on the ambient environment (CI) */
  }
}

await loadDotEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url) fail('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!key) fail('SUPABASE_SERVICE_ROLE_KEY is not set');

const manifestOnly = process.argv.includes('--manifest-only');
const outArg = process.argv.indexOf('--out');
const outDir =
  outArg !== -1 ? process.argv[outArg + 1] : join(process.env.HOME || '.', 'Backups', 'tangodachi');

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

async function listPrefix(prefix) {
  const entries = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prefix,
        limit: PAGE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      }),
    });
    if (!res.ok) fail(`list ${prefix || '/'} failed: ${res.status} ${await res.text()}`);
    const page = await res.json();
    entries.push(...page);
    if (page.length < PAGE) break;
  }
  return entries;
}

// Storage has no real directories: an entry with a null id is a synthetic folder row
// produced by the delimiter search, so recursion is the only way to see every object.
async function walk(prefix = '') {
  const objects = [];
  for (const entry of await listPrefix(prefix)) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) objects.push(...(await walk(path)));
    else
      objects.push({ path, size: entry.metadata?.size ?? 0, etag: entry.metadata?.eTag ?? null });
  }
  return objects;
}

const objects = await walk();
const total = objects.reduce((sum, o) => sum + o.size, 0);
const mb = (total / 1024 / 1024).toFixed(1);
console.log(`${BUCKET}: ${objects.length} objects, ${mb} MB`);

const byPrefix = new Map();
for (const o of objects) {
  const group = o.path.includes('/') ? o.path.slice(0, o.path.indexOf('/')) : '(root)';
  const current = byPrefix.get(group) || { count: 0, bytes: 0 };
  byPrefix.set(group, { count: current.count + 1, bytes: current.bytes + o.size });
}
for (const [group, s] of [...byPrefix].sort()) {
  console.log(`  ${group}: ${s.count} objects, ${(s.bytes / 1024 / 1024).toFixed(1)} MB`);
}

const root = join(outDir, 'storage', BUCKET);
await mkdir(root, { recursive: true });
await writeFile(
  join(outDir, 'storage', `${BUCKET}.manifest.json`),
  `${JSON.stringify({ bucket: BUCKET, objectCount: objects.length, totalBytes: total, objects }, null, 2)}\n`,
);

if (manifestOnly) {
  console.log(`-> ${join(outDir, 'storage', `${BUCKET}.manifest.json`)}`);
  process.exit(0);
}

let downloaded = 0;
let skipped = 0;
for (const object of objects) {
  const dest = join(root, object.path);
  const existing = await stat(dest).catch(() => null);
  if (existing && existing.size === object.size) {
    skipped += 1;
    continue;
  }
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${encodeURI(object.path)}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) fail(`download ${object.path} failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  downloaded += 1;
}

const onDisk = await readdir(root, { recursive: true });
console.log(`downloaded ${downloaded}, unchanged ${skipped}, on disk ${onDisk.length} entries`);
console.log(`-> ${root}`);
