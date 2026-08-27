#!/usr/bin/env bash
# Full logical backup of the hosted Supabase Postgres. Read-only: pg_dump/psql SELECTs only.
set -euo pipefail

BUCKET_SCHEMAS="public"
KEEP="${BACKUP_KEEP:-30}"
OUT_ROOT="${BACKUP_DIR:-$HOME/Backups/tangodachi}"
STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

die() {
  echo "error: $*" >&2
  exit 1
}
note() { echo "==> $*"; }

# --- locate a Postgres 17 client -------------------------------------------------
for candidate in /opt/homebrew/opt/postgresql@17/bin /usr/local/opt/postgresql@17/bin /usr/lib/postgresql/17/bin; do
  [ -d "$candidate" ] && PATH="$candidate:$PATH"
done
export PATH
command -v pg_dump >/dev/null || die "pg_dump not found (brew install postgresql@17)"
PG_MAJOR="$(pg_dump --version | sed -E 's/.* ([0-9]+)\..*/\1/')"
[ "$PG_MAJOR" -ge 17 ] || die "pg_dump is $PG_MAJOR, server is 17 — pg_dump refuses to dump a newer server (brew install postgresql@17)"
command -v supabase >/dev/null || die "supabase CLI not found"

# --- credentials ------------------------------------------------------------------
if [ -f "$(dirname "$0")/../../.env" ] && [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$(dirname "$0")/../../.env"
  set +a
fi
[ -n "${SUPABASE_DB_PASSWORD:-}" ] || die "SUPABASE_DB_PASSWORD is not set (Supabase dashboard → Settings → Database)"
[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ] || die "NEXT_PUBLIC_SUPABASE_URL is not set"

REF="$(printf '%s' "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's#https?://([^.]+)\..*#\1#')"
[ -n "$REF" ] || die "could not derive the project ref from NEXT_PUBLIC_SUPABASE_URL"

# The direct host db.<ref>.supabase.co is IPv6-only on the free plan; the session-mode
# pooler on 5432 is the IPv4 path that pg_dump can actually use. Port 6543 will not work.
export PGHOST="${SUPABASE_DB_HOST:-aws-1-us-east-1.pooler.supabase.com}"
export PGPORT="${SUPABASE_DB_PORT:-5432}"
export PGUSER="${SUPABASE_DB_USER:-postgres.$REF}"
export PGPASSWORD="$SUPABASE_DB_PASSWORD"
export PGDATABASE="${SUPABASE_DB_NAME:-postgres}"
export PGSSLMODE="${SUPABASE_DB_SSLMODE:-require}"
export PGCONNECT_TIMEOUT=30

note "project $REF via $PGHOST:$PGPORT as $PGUSER"
psql -Atqc 'select 1' >/dev/null || die "cannot connect — check SUPABASE_DB_PASSWORD and SUPABASE_DB_HOST"

# --- generate Supabase's own pg_dump pipelines, then run them with the native client --
# `supabase db dump` shells out to Docker, which we do not have. --dry-run emits the exact
# pg_dump/sed pipeline instead, so the filter list stays Supabase's to maintain, not ours.
gen() {
  local target="$1"
  shift
  supabase db dump --db-url "postgresql://postgres:pw@127.0.0.1:1/postgres" --dry-run "$@" 2>/dev/null |
    awk '/^#!\/usr\/bin\/env bash/ {emit=1} emit' |
    grep -v '^export PG' >"$target"
  [ -s "$target" ] || die "supabase db dump --dry-run produced no script for $*"
}

DUMP="$WORK/dump"
mkdir -p "$DUMP"

note "dumping roles"
gen "$WORK/roles.gen.sh" --role-only
if bash "$WORK/roles.gen.sh" >"$DUMP/roles.sql" 2>"$WORK/roles.err"; then
  ROLES_STATUS="ok"
else
  ROLES_STATUS="FAILED: $(tr '\n' ' ' <"$WORK/roles.err" | head -c 200)"
  echo "warning: role dump failed, continuing — $ROLES_STATUS" >&2
  : >"$DUMP/roles.sql"
fi

note "dumping schema"
gen "$WORK/schema.gen.sh"
bash "$WORK/schema.gen.sh" >"$DUMP/schema.sql" || die "schema dump failed"

note "dumping data"
gen "$WORK/data.gen.sh" --data-only --use-copy
bash "$WORK/data.gen.sh" >"$DUMP/data.sql" || die "data dump failed"

# Supabase's data dump excludes supabase_migrations.schema_migrations. Without it a restored
# project has no migration history and `supabase db push` tries to replay every migration.
note "dumping migration history"
# schema.sql excludes the supabase_migrations schema, so this file has to carry its own
# CREATE statements or it cannot be replayed into a fresh project.
{
  echo 'CREATE SCHEMA IF NOT EXISTS "supabase_migrations";'
  pg_dump --schema-only --quote-all-identifier --table 'supabase_migrations.schema_migrations' |
    sed -E 's/^CREATE TABLE "/CREATE TABLE IF NOT EXISTS "/'
  pg_dump --data-only --quote-all-identifier --table 'supabase_migrations.schema_migrations'
} >"$DUMP/migration_history.sql" || die "migration history dump failed"

# --- verify the dump actually contains the rows the database says it has ------------
note "verifying"
psql -Atq -F$'\t' >"$WORK/counts.tsv" <<SQL
SELECT table_name,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint
FROM information_schema.tables
WHERE table_schema = '$BUCKET_SCHEMAS' AND table_type = 'BASE TABLE'
ORDER BY table_name;
SQL

MISSING=""
MISMATCH=""
while IFS=$'\t' read -r table live; do
  [ -n "$table" ] || continue
  dumped="$(awk -v t="\"public\".\"$table\"" '
    $0 ~ "^COPY " t " " {inside=1; next}
    inside && $0 == "\\." {inside=0}
    inside {n++}
    END {print n+0}' "$DUMP/data.sql")"
  printf '%s\t%s\t%s\n' "$table" "$live" "$dumped" >>"$WORK/verified.tsv"
  # Counts are read after the dump, so a row or two of drift from a concurrent write is
  # expected. Anything past that is a truncated dump and must not be stored as a backup.
  tolerance=$((live / 100))
  [ "$tolerance" -lt 5 ] && tolerance=5
  if [ "$((live - dumped))" -gt "$tolerance" ]; then
    MISSING="$MISSING $table(live=$live,dump=$dumped)"
  elif [ "$live" != "$dumped" ]; then
    MISMATCH="$MISMATCH $table(live=$live,dump=$dumped)"
  fi
done <"$WORK/counts.tsv"

[ -z "$MISSING" ] || die "dump is short on rows — refusing to store it:$MISSING"
[ -z "$MISMATCH" ] || echo "warning: row counts drifted during the dump (concurrent writes):$MISMATCH" >&2

{
  echo "taken_at:        $STAMP"
  echo "project_ref:     $REF"
  echo "server_version:  $(psql -Atqc 'show server_version')"
  echo "pg_dump_version: $(pg_dump --version)"
  echo "roles_dump:      $ROLES_STATUS"
  echo "row_drift:       ${MISMATCH:-none}"
  echo
  echo "restore order:   roles.sql -> schema.sql -> data.sql -> migration_history.sql"
  echo "storage bucket:  NOT included — run ops/backup/backup-storage.mjs separately"
  echo
  printf 'table\tlive_rows\tdumped_rows\n'
  cat "$WORK/verified.tsv"
} >"$DUMP/MANIFEST.txt"

# --- package ----------------------------------------------------------------------
mkdir -p "$OUT_ROOT/db"
ARCHIVE="$OUT_ROOT/db/tangodachi-db-$STAMP.tar.gz"
tar -czf "$ARCHIVE" -C "$WORK" dump
cp "$DUMP/MANIFEST.txt" "$OUT_ROOT/db/tangodachi-db-$STAMP.manifest.txt"

if [ -n "${BACKUP_AGE_RECIPIENT:-}" ]; then
  command -v age >/dev/null || die "BACKUP_AGE_RECIPIENT is set but age is not installed"
  age -r "$BACKUP_AGE_RECIPIENT" -o "$ARCHIVE.age" "$ARCHIVE"
  rm -f "$ARCHIVE"
  ARCHIVE="$ARCHIVE.age"
fi

# --- prune: keep the newest $KEEP, plus every first-of-month forever ----------------
# Sorted by filename, not mtime: a CI checkout gives every file the same timestamp, so
# mtime ordering would prune the wrong archives. The names are ISO timestamps already.
if [ "$KEEP" -gt 0 ]; then
  ls -1 "$OUT_ROOT/db"/tangodachi-db-*.tar.gz* 2>/dev/null | sort -r | tail -n "+$((KEEP + 1))" | while read -r old; do
    case "$old" in
    *-01T*) continue ;;
    esac
    rm -f "$old" "${old%.age}" "$(echo "$old" | sed -E 's/\.tar\.gz(\.age)?$/.manifest.txt/')"
  done
fi

note "wrote $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"
