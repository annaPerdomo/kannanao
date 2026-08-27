#!/usr/bin/env bash
# Reads the database password once, proves it works, then stores it in both places that
# need it: .env for local backups and the private backup repo's Actions secret.
set -euo pipefail

BACKUP_REPO="${BACKUP_REPO:-annaPerdomo/tangodachi-backups}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/.env"

die() {
  echo "error: $*" >&2
  exit 1
}

for candidate in /opt/homebrew/opt/postgresql@17/bin /usr/local/opt/postgresql@17/bin /usr/lib/postgresql/17/bin; do
  [ -d "$candidate" ] && PATH="$candidate:$PATH"
done
export PATH
command -v psql >/dev/null || die "psql not found (brew install postgresql@17)"
command -v gh >/dev/null || die "gh not found (brew install gh)"
[ -f "$ENV_FILE" ] || die "no .env at $ENV_FILE"

SUPABASE_URL="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"'"'"' ')"
REF="$(printf '%s' "$SUPABASE_URL" | sed -E 's#https?://([^.]+)\..*#\1#')"
[ -n "$REF" ] || die "could not read the project ref from .env"

echo "Project $REF"
echo "Dashboard → Project Settings → Database → Database password"
printf 'Database password: '
read -rs PW || true
echo
[ -n "$PW" ] || die "no password entered"

export PGHOST="${SUPABASE_DB_HOST:-aws-1-us-east-1.pooler.supabase.com}"
export PGPORT=5432
export PGUSER="postgres.$REF"
export PGPASSWORD="$PW"
export PGDATABASE=postgres
export PGSSLMODE=require
export PGCONNECT_TIMEOUT=30

echo "==> testing the connection"
psql -Atqc 'select 1' >/dev/null 2>&1 || die "could not connect — wrong password, or reset it in the dashboard"
echo "    connected as $PGUSER"

echo "==> writing SUPABASE_DB_PASSWORD to .env"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
grep -v '^SUPABASE_DB_PASSWORD=' "$ENV_FILE" >"$TMP" || true
printf '\n# Supabase database password (backups only — see docs/backups.md)\nSUPABASE_DB_PASSWORD=%s\n' "$PW" >>"$TMP"
cat "$TMP" >"$ENV_FILE"
git -C "$ROOT" check-ignore -q .env || die ".env is not gitignored — refusing to leave a password in a tracked file"

echo "==> setting the Actions secret on $BACKUP_REPO"
printf '%s' "$PW" | gh secret set SUPABASE_DB_PASSWORD --repo "$BACKUP_REPO" >/dev/null
echo "    secret set"

echo
echo "Done. Next:"
echo "  pnpm db:backup                                       # first real backup"
echo "  gh workflow run nightly-backup.yml --repo $BACKUP_REPO   # first cloud backup"
