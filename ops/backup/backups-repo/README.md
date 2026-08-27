# tangodachi-backups

Template for the **private** repo that stores nightly Tangodachi database backups. This directory
is inert here — GitHub only runs workflows from `.github/workflows/` at a repo root.

The live repo is [`annaPerdomo/tangodachi-backups`](https://github.com/annaPerdomo/tangodachi-backups).
It already exists, is private, holds this workflow, and has its three variables set:

| Variable               | Value                                 |
| ---------------------- | ------------------------------------- |
| `SUPABASE_URL`         | `https://<ref>.supabase.co`           |
| `SUPABASE_DB_HOST`     | `aws-1-us-east-1.pooler.supabase.com` |
| `BACKUP_AGE_RECIPIENT` | the age **public** key                |

The one remaining secret, `SUPABASE_DB_PASSWORD`, is set by
`ops/backup/setup-credentials.sh` in the app repo.

The workflow checks out `annaPerdomo/kannanao` at `main` to get the backup scripts, so it needs no
token for that step — the app repo is public. It also means **the scripts must be on `main`** for
the nightly job to run.

## Rebuilding it from scratch

1. Create a **private** repo, copy in `.github/workflows/nightly-backup.yml`, push.
2. Set the three variables above (Settings → Secrets and variables → Actions → Variables).
3. Run `ops/backup/setup-credentials.sh` to set `SUPABASE_DB_PASSWORD`.
4. Actions → Nightly Supabase backup → Run workflow, and confirm a
   `db/tangodachi-db-*.tar.gz.age` lands on `main`.

Never put the age _private_ key or `SUPABASE_SERVICE_ROLE_KEY` in that repo.
