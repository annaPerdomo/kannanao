# The demo system

Built for the Cal State Fullerton pilot: teachers need to see real practice working, not a
scripted animation. Every piece below runs the actual product code — see "How it stays honest".

## What exists

- **The What-if page** — `/how-it-works/practice` (and `/how-it-works/practice/ja`). Public, no
  sign-in. Pick a learner, mark words right or wrong, watch the real planner react.
- **The demo group** — a teacher account `demo-teacher` and six learners (`demo-maya`, `demo-ken`,
  `demo-sora`, `demo-hana`, `demo-leo`, `demo-rin`), all `@kannanao.local`. Everyone signs in
  through the normal login form with their username and the shared `DEMO_PASSWORD`. That password
  lives in Vercel's env vars (server-side, for the reset route) and in the GitHub repo's Actions
  secrets (for the nightly check) — nowhere else.
- **The nightly reset** — `GET /api/cron/demo-reset`, scheduled in `vercel.json` at 10:00 UTC.
  Rebuilds the teacher, the group, the deck, and all six learners' history from
  `src/lib/demo/personas.ts`, so the demo never goes stale or drifts out of sync with itself. It's
  idempotent and skips if a run finished in the last 5 minutes. Trigger it by hand:
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://tangodachi.app/api/cron/demo-reset
  ```
- **The nightly check** — `.github/workflows/demo-nightly.yml`, scheduled an hour after the reset
  (11:00 UTC) plus manual `workflow_dispatch`. Signs in as the demo learner and teacher against
  production and screenshots the real pages; it only reads — any write a page tries on mount is
  aborted. Only the screenshots upload as a workflow artifact (14-day retention), never a trace or
  the HTML report, since either could carry the signed-in demo session into this public repo's
  Actions logs.

## Go-live order

1. Apply migration `supabase/migrations/20261023120000_demo_account_guards.sql` to production by
   hand (Supabase has no migration runner for this repo yet).
2. Deploy.
3. Set `DEMO_PASSWORD` in both Vercel's env vars and the GitHub repo's Actions secrets. **Never set
   it before step 1** — until the migration is live, the database guards below don't exist, and a
   signed-in demo session could write through PostgREST past every API guard.
4. Trigger the reset once by hand (the `curl` above).
5. Run the nightly workflow by hand (`workflow_dispatch`) to confirm it's green before trusting the
   schedule.

## Safety model

- Demo identity is the auth JWT's `app_metadata.demo` claim, set once by the reset when it creates
  the account — nothing else can set it, and no API guard trusts `profiles.username` alone.
- The migration's RLS policies and `profiles` trigger stop a demo session from changing its own
  identity, or creating a real invite, assignment, encouragement, message, or share — even via a
  direct PostgREST write that never touches our API.
- The AI-cost routes (Gemini, Unsplash) 403 any demo account, since the password is shared and
  public.
- The reset only ever deletes rows owned by accounts it marked itself, or rows about the demo
  teacher's own deck — never an unfiltered delete, never a real user's row outside that deck.

## How it stays honest

**The one rule**: demo code never reimplements practice logic — it only imports the real exported
functions (`planDailyPractice`, `nextSchedule`, `pickFocusDeck`, …) and their named constants. A
hand-copied threshold or a parallel mode list is a bug, not a shortcut.

Three fences catch drift at different layers:

| Fence                                                                  | Catches                                                                                                                       |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/__tests__/srsParity.test.ts`                                  | The TS scheduler (`nextSchedule`) disagreeing with the live SQL twin (`srs_next`).                                            |
| The persona goldens (`src/lib/demo/__tests__/simulate.golden.test.ts`) | A planner/scheduler rule change, surfaced as a reviewed snapshot diff.                                                        |
| The nightly learner-plan check (`e2e/demo/learner.spec.ts`)            | The real app feeding the planner something the simulator didn't expect — a hook drifting from the planner, a broken launcher. |

## When you change practice or teacher rules

- Run `pnpm exec vitest run src/lib/demo`. If the goldens change, read the diff — if it's the
  intended behaviour, accept it with `-u` **in the same PR** as the rule change.
- If `srs_next` changes, run `pnpm srs:vectors` to regenerate the parity fixture.
- A new practice mode goes in the existing registries — `MODE_EMOJI` (`src/lib/chainModes.ts`),
  the `Group.goalPicker.modes.*` i18n names, and `PROGRESS_WRITES` (`src/lib/demo/simulate.ts`) —
  plus a `REASON_KEYS` mapping in `src/lib/demo/explain.ts`.
- A new table the group page reads from must be added to `resetDemo` (`src/app/api/cron/demo-reset/resetDemo/`),
  or the demo group will silently look emptier than a real one.
