# Database backups

Supabase Free has **no managed backups** — the dashboard reads `LAST BACKUP: No backups`. Nothing
in the hosted project protects you from a dropped table, a bad migration, a deleted project, or an
account problem. Everything below is the replacement for that.

The August 2026 outage was an _availability_ failure and no data was lost. These backups exist for
the failure that comes after that one.

## What is and is not covered

| Covered                                                                | How                                  |
| ---------------------------------------------------------------------- | ------------------------------------ |
| Every row in `public` — decks, cards, progress, sessions, messages     | `data.sql` in each archive           |
| Logins (`auth.users`) and Storage metadata (`storage.objects`)         | same dump: it includes those schemas |
| Tables, functions, RLS policies, triggers, indexes                     | `schema.sql`                         |
| Migration history, so a restored project does not replay 55 migrations | `migration_history.sql`              |
| The 222 MB of images and videos in the `card-images` bucket            | **local mirror only** — see below    |

The bucket is deliberately excluded from the nightly job: it is 222 MB (mostly chat photos) and
would bloat the backup repo within weeks. `storage.objects` _is_ in every DB dump, so a restored
database always knows exactly which files should exist; the bytes come from your local mirror.

## Daily, automatic

A private repo, `tangodachi-backups`, runs [the nightly workflow](../ops/backup/backups-repo/.github/workflows/nightly-backup.yml)
at 02:00 Pacific. It dumps, verifies, encrypts, and commits the archive. Retention is the newest 30
plus every first-of-month forever, so a year of history costs about 15 MB.

It runs `ops/backup/backup-db.sh` **from this repo**, checked out at `main`. Moving or renaming
`ops/backup/` breaks the nightly job silently — the workflow is the only consumer outside this repo.

Failed scheduled runs email the repo owner. GitHub also disables schedules on repos with no
activity for 60 days; the nightly commit normally counts, but if backups stop, check the Actions
tab first.

## By hand

```bash
pnpm db:backup           # dump + verify -> ~/Backups/tangodachi/db/
pnpm db:backup:storage   # mirror the bucket (incremental; only new objects download)
pnpm db:backup:size      # what is in the bucket, without downloading
```

Run `pnpm db:backup` before any migration you are not sure about. It takes seconds.

Requirements: `brew install postgresql@17 age`, and `SUPABASE_DB_PASSWORD` in `.env`
(Supabase dashboard → Project Settings → Database → Database password). `pg_dump` 16 will refuse
to dump a Postgres 17 server, which is why the pinned version matters.

The connection goes through the **session-mode pooler on port 5432**, not `db.<ref>.supabase.co`
(IPv6-only on Free) and not port 6543 (transaction mode, which `pg_dump` cannot use).

## Verification is part of the backup

`backup-db.sh` counts the rows of every `public` table in the live database and compares them to
the rows actually present in `data.sql`. A shortfall beyond 1% (minimum 5 rows) **fails the run and
stores nothing**, so a silently truncated dump cannot masquerade as a backup. Small drift from a
concurrent write is recorded in the manifest as a warning.

Each archive ships a plaintext `*.manifest.txt` sidecar so you can see what a backup contains
without decrypting it.

## Encryption

Archives are encrypted to an [age](https://age-encryption.org) public key. The workflow holds only
the _public_ half, so a compromised CI secret can write backups but never read one.

The private key lives at `~/.config/tangodachi/backup-key.txt`.

> **Losing that file makes every backup permanently unreadable.** Put a copy in your password
> manager now. It is a single short line beginning `AGE-SECRET-KEY-`.

## Restoring

```bash
BACKUP_AGE_KEY_FILE=~/.config/tangodachi/backup-key.txt \
  pnpm db:restore ~/Backups/tangodachi/db/tangodachi-db-<stamp>.tar.gz.age \
  "postgresql://postgres:<pw>@db.<new-ref>.supabase.co:5432/postgres"
```

It applies `roles.sql → schema.sql → data.sql → migration_history.sql`, then re-counts every table
against the manifest and fails if anything is short. `restore-db.sh` refuses any target containing
the live project ref, so it cannot be pointed at production by accident.

After the database is back, re-upload the bucket from your local mirror at
`~/Backups/tangodachi/storage/card-images/`, then point `.env` and the Vercel environment at the
new project ref.

### Practice it

A backup nobody has restored is a hypothesis. Once a quarter, restore the newest archive into a
scratch Supabase project and sign in against it. Free organizations allow two projects and both
slots are in use (`Japanese Flashcards`, `Meme Bingo`), so the drill needs a spare slot or a second
free organization.

## Do not

- Do not commit dumps to this repo. It is **public**. The nightly job writes to a private repo for
  exactly this reason, and GitHub Actions artifacts on a public repo are world-downloadable.
- Do not put `SUPABASE_SERVICE_ROLE_KEY` in the backup repo. The nightly job needs only the
  database password; storage runs locally.
