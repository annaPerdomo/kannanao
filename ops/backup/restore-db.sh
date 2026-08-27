#!/usr/bin/env bash
# Restores a backup archive into a TARGET database. Never run this against production:
# the guard below refuses the live project ref, because restore order drops nothing but
# data.sql replays every row and would duplicate or conflict with live data.
set -euo pipefail

die() {
  echo "error: $*" >&2
  exit 1
}
note() { echo "==> $*"; }

ARCHIVE="${1:-}"
TARGET="${2:-${RESTORE_DB_URL:-}}"
[ -n "$ARCHIVE" ] || die "usage: restore-db.sh <archive.tar.gz[.age]> <target-postgres-url>"
[ -n "$TARGET" ] || die "usage: restore-db.sh <archive> <target-postgres-url>"

if [ -f "$(dirname "$0")/../../.env" ]; then
  PROD_URL="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$(dirname "$0")/../../.env" | head -1 | cut -d= -f2- | tr -d '"'"'"' ')"
  PROD_REF="$(printf '%s' "$PROD_URL" | sed -E 's#https?://([^.]+)\..*#\1#')"
  if [ -n "$PROD_REF" ] && printf '%s' "$TARGET" | grep -q "$PROD_REF"; then
    die "refusing to restore into the production project ($PROD_REF)"
  fi
fi

[ -f "$ARCHIVE" ] || die "no such archive: $ARCHIVE"

for candidate in /opt/homebrew/opt/postgresql@17/bin /usr/local/opt/postgresql@17/bin /usr/lib/postgresql/17/bin; do
  [ -d "$candidate" ] && PATH="$candidate:$PATH"
done
export PATH
command -v psql >/dev/null || die "psql not found (brew install postgresql@17)"


WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ "${ARCHIVE##*.}" = "age" ]; then
  command -v age >/dev/null || die "age not found (brew install age)"
  [ -n "${BACKUP_AGE_KEY_FILE:-}" ] || die "BACKUP_AGE_KEY_FILE is not set — the private key is the only way to read this archive"
  [ -f "$BACKUP_AGE_KEY_FILE" ] || die "no key file at $BACKUP_AGE_KEY_FILE"
  note "decrypting"
  age -d -i "$BACKUP_AGE_KEY_FILE" -o "$WORK/archive.tar.gz" "$ARCHIVE"
  ARCHIVE="$WORK/archive.tar.gz"
fi

tar -xzf "$ARCHIVE" -C "$WORK"
DUMP="$WORK/dump"
[ -f "$DUMP/schema.sql" ] || die "archive has no dump/schema.sql — is this a tangodachi backup?"

note "restoring into $(printf '%s' "$TARGET" | sed -E 's#://[^@]*@#://***@#')"
sed -n '1,12p' "$DUMP/MANIFEST.txt"

for part in roles schema data migration_history; do
  file="$DUMP/$part.sql"
  [ -s "$file" ] || {
    echo "skipping empty $part.sql"
    continue
  }
  note "applying $part.sql"
  if ! psql --single-transaction --variable ON_ERROR_STOP=1 --dbname "$TARGET" --file "$file" >/dev/null; then
    # Migration history is bookkeeping, not data: a target that already ran migrations
    # conflicts on the primary key, and that must not abort a restore of real rows.
    [ "$part" = "migration_history" ] || die "$part.sql failed to apply"
    echo "warning: migration_history.sql did not apply — reconcile supabase_migrations by hand" >&2
  fi
done

note "verifying restored row counts against the manifest"
FAILED=0
while IFS=$'\t' read -r table expected _; do
  case "$table" in table | '' | *:* | restore* | storage*) continue ;; esac
  actual="$(psql -Atqc "select count(*) from public.\"$table\"" "$TARGET" 2>/dev/null || echo missing)"
  if [ "$actual" != "$expected" ]; then
    echo "  MISMATCH $table: manifest=$expected restored=$actual"
    FAILED=1
  fi
done < <(awk '/^table\tlive_rows/{on=1;next} on' "$DUMP/MANIFEST.txt")

[ "$FAILED" -eq 0 ] || die "restore verification failed"
note "restore verified: every table matches the manifest"
echo
echo "Storage objects are NOT in this archive. Re-upload them from your local mirror:"
echo "  ops/backup/backup-storage.mjs --manifest-only   # what should exist"
