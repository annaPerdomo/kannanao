# tangodachi-backups

Template for the **private** repo that stores nightly Tangodachi database backups. This directory
is inert here — GitHub only runs workflows from `.github/workflows/` at a repo root.

## One-time setup

1. Create a **private** repo named `tangodachi-backups`.
2. Copy `.github/workflows/nightly-backup.yml` into it and push.
3. Add repository **variables** (Settings → Secrets and variables → Actions → Variables):
   - `SUPABASE_URL` — `https://<ref>.supabase.co`
   - `SUPABASE_DB_HOST` — `aws-1-us-east-1.pooler.supabase.com`
   - `BACKUP_AGE_RECIPIENT` — the age **public** key (safe to store as a plain variable)
4. Add one repository **secret**:
   - `SUPABASE_DB_PASSWORD` — Supabase dashboard → Project Settings → Database
5. Run the workflow once via **Actions → Nightly Supabase backup → Run workflow** and confirm a
   `db/tangodachi-db-*.tar.gz.age` lands on `main`.

The workflow checks out `annaPerdomo/kannanao` at `main` to get the backup scripts, so it needs no
token for that step — the app repo is public.

Never put the age _private_ key or `SUPABASE_SERVICE_ROLE_KEY` in this repo.
