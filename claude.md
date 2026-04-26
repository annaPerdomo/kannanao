---
description: 'Kannanao (Next.js/React/MUI) development guidelines. Use when: writing components, styling, creating features, or improving code. Follow functional components, MUI styling patterns.'
---

# Kannanao Development Guidelines

Next.js 15 app with React 19, MUI 7, Supabase, TypeScript.

## Quick Reference

**Scripts**: `pnpm dev` | `pnpm build` | `pnpm lint`

**Path Alias**: `@/*` → `./src/*` (e.g. `@/components/DeckCard`, `@/lib/supabase`)

**Folders**:

- `components/` — reusable UI components
- `hooks/` — custom React hooks (data fetching + logic)
- `lib/` — Supabase client + DB adapter functions
- `services/` — API client functions (Gemini, Unsplash)
- `contexts/` — React Context providers
- `theme/` — MUI theme with design tokens
- `types/` — shared TypeScript interfaces
- `app/` — Next.js App Router pages and API routes
- `pages/` — legacy page components (do not add new files here)

## File Size & Structure

- **Max ~300 lines per component file.** If a component grows past this, extract it into a folder.
- When extracting, convert `ComponentName.tsx` → `ComponentName/index.tsx` + sub-components. This preserves existing import paths.
- Each folder must have a barrel export (`index.ts` or `index.tsx`) that re-exports all public members.
- Extract into the folder: constants/config arrays → `constants.ts`, shared `sx` style objects → `styles.ts`, particle/animation sub-components → their own files.
- Types used only within the folder stay in `constants.ts` or the file that uses them. Shared types go in `src/types/`.
- Sub-components that are only used by the parent don't need their own folder — a flat file in the parent's folder is fine.
- Reuse components across feature folders via imports (e.g. `import { Label } from '@/components/Deck'`) rather than duplicating.
- After any extraction, run `pnpm build` to verify nothing broke.

## Component Patterns

- Add `'use client'` directive for interactive components
- Functional components with hooks; define `interface <ComponentName>Props {}`
- Extract data/logic into `src/hooks/`; use Context API to avoid prop drilling
- Performance: `React.memo()`, `useCallback` for stable refs, `useMemo` for expensive computations
- Composition over inheritance
- Use `<StyledDialog>` (`@/components/StyledDialog`) for all modal/dialog UI. It provides the shared gradient header, close button, rounded borders, and theme-aware colors. Pass `title`, `subtitle`, `icon`, `actions`, and children. Only skip it for highly custom layouts (e.g. Shop purchase confirmation).

## Accessibility

- All `IconButton` components must have an `aria-label`
- Clickable non-semantic elements (`Box` with `onClick`) must have `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler for Enter/Space
- Dialogs should use `aria-labelledby` referencing the title element's `id` (StyledDialog supports a `titleId` prop)
- The app has a skip-to-content link (`SkipToContent` component) and a `<main id="main-content">` landmark in `AppShell`

## MUI & Styling

- Use `sx` prop with theme tokens (`theme.palette`, `theme.spacing`, `theme.typography`)
- No inline `style={{}}` objects
- Default imports: `import Box from '@mui/material/Box'`
- Layouts: `Box`, `Stack`, `Grid`, `Container`
- Colors and design tokens are defined in `src/theme/index.ts` — reference theme values via `sx`, do not hardcode hex values

## Data Layer

**Supabase** (`src/lib/supabase.ts`):

- Client exported as `sb`
- DB-to-app adapter functions: `dbCardToApp`, `dbDeckToApp`
- Tables: `decks` (id, name, description, created_at) and `cards` (id, deck_id, word, reading, meaning, image_url, example_jp, example_en, main_view_mode)
- Group tables: `invite_codes`, `assignments`, `encouragements` (see Group System section below)
- `profiles` has `account_type` ('organizer'|'member'), `organizer_id` (FK), `show_leaderboard` (boolean)
- Check `isConfigured()` before making DB calls

**API routes** (`src/app/api/`):

- `/api/generate` — calls Google Gemini API to generate flashcard fields (POST, organizer-only)
- `/api/images` — fetches images from Unsplash by query (GET, organizer-only)
- `/api/furigana` — calls Google Gemini API to add furigana readings to Japanese text using `{kanji|reading}` format (POST, organizer-only)
- `/api/pdf-extract` — calls Google Gemini API to extract vocabulary from a PDF and generate full flashcard data (POST, organizer-only)
- `/api/public/deck/[id]` — public read-only endpoint to fetch a deck and its cards by ID without auth (GET)
- `/api/group/*` — group management routes (see Group System section below)
- `/api/join` — public invite code validation (GET) and member account creation (POST)

All API routes that call external services use **rate limiting** (`src/app/api/_lib/rateLimit.ts`) and **structured logging** (`src/lib/logger.ts`). New API routes should follow the same pattern:

```ts
import { logger } from '@/lib/logger';
import { rateLimit } from '../_lib/rateLimit';

const RATE_LIMIT = { windowMs: 60_000, max: 10 };

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;
  // ... handler logic, use logger.error/logger.info instead of console
}
```

Rate limiting is IP-based and automatically bypassed for the admin user (verified server-side via Supabase auth token). Admin bypass is checked in `rateLimit.ts` using `isAdminEmail()` from `@/lib/admin`.

**API client** (`src/services/api.ts`):

- `generateFlashcards()` — calls `/api/generate`
- `fetchImage()` — calls `/api/images`
- All client-side API calls include the Supabase auth token via `authHeaders()` so the rate limiter can identify admin requests

**Database migrations** (`supabase/migrations/`):

- Baseline migration captures the full production schema
- `20260426000000_add_group_system.sql` — adds group system tables and profile columns
- Supabase CLI is linked to the project (`supabase link`)
- New schema changes should be added as incremental migration files

## Group System (Organizer/Member Accounts)

Two account types: **organizer** (full access) and **member** (limited, no paid API access). Organizers invite members via QR codes, monitor progress, assign decks, and send encouragement.

### Key patterns

**Auth gating (server-side)**: `requireOrganizerAccount()` in `src/app/api/_lib/requireOrganizerAccount.ts` — extracts Bearer token, checks profile, returns 403 for members. Used by all 4 cost-incurring API routes and organizer-only group routes.

**Auth gating (client-side)**: `isMemberAccount` from `useAuth()` — boolean from `AuthContext` that gates UI (hides deck creation, AI generation, group nav). Use this for conditional rendering, never for security.

**Service role client**: `getServiceSupabase()` in `src/app/api/group/_lib/serviceSupabase.ts` — bypasses RLS for group API routes. Requires `SUPABASE_SERVICE_ROLE_KEY` env var.

### Group API routes (`src/app/api/group/`)

| Route                                       | Auth            | Purpose                    |
| ------------------------------------------- | --------------- | -------------------------- |
| `POST /api/group/invite`                    | Organizer       | Create invite code         |
| `GET /api/group/invite`                     | Organizer       | List invites               |
| `DELETE /api/group/invite/[id]`             | Organizer       | Revoke invite              |
| `GET /api/group/members`                    | Organizer       | List members with progress |
| `GET /api/group/members/[id]`               | Organizer       | Detailed member stats      |
| `POST /api/group/assignments`               | Organizer       | Create assignment(s)       |
| `GET /api/group/assignments`                | Both (filtered) | List assignments           |
| `PATCH /api/group/assignments/[id]`         | Organizer       | Update assignment          |
| `DELETE /api/group/assignments/[id]`        | Organizer       | Remove assignment          |
| `POST /api/group/assignments/complete`      | Any auth        | Auto-complete on study     |
| `POST /api/group/encouragements`            | Organizer       | Send encouragement         |
| `GET /api/group/encouragements`             | Member          | Get messages               |
| `PATCH /api/group/encouragements/[id]/read` | Member          | Mark as read               |
| `GET /api/group/leaderboard`                | Both            | Weekly rankings            |
| `GET /api/group/feed`                       | Organizer       | Activity feed              |

All group routes follow: rate limit check → auth check → service supabase.

### Group hooks

- `useInvites()` — invite CRUD with optimistic revoke
- `useGroupMembers()` / `useMemberDetail()` / `useGroupFeed()` — in `src/hooks/useGroup.ts`
- `useGroupLeaderboard()` — weekly rankings
- `useAssignments()` — assignment CRUD with optimistic updates
- `useEncouragements()` — send, markAsRead, markAllAsRead, unreadCount

### Group components (`src/components/Group/`)

GroupOverview, MemberCard, MemberDetail, LeaderboardWidget, ActivityFeed, CreateAssignmentDialog, AssignmentCard, CreateInviteDialog, InviteQRCode, InviteList, EncouragementForm, EncouragementInbox — all barrel-exported from `index.ts`.

### Group pages

- `/group` — organizer dashboard (members, leaderboard, feed, assignments)
- `/join/[code]` — public join page for QR invite flow

## Hooks Pattern

Hooks in `src/hooks/` follow this pattern:

- Load data on mount, expose async action functions with optimistic updates
- Always return `{ data, loading, error, ...actions }`
- Use `useCallback` for all action functions
- All CRUD actions must handle loading, error, and success states; use try/catch and set error state on failure
- Optimistic updates should be rolled back on error

## State Handling in Components

Every component that fetches or mutates data must:

- Show a loading state using `<Loading />` (`@/components/Loading`) while `loading` is true
- Show an error state (e.g. `<Alert severity="error">`) when `error` is set
- Confirm success visually (e.g. `<Alert severity="success">` or snackbar) after mutations
- Disable action buttons while a mutation is in-flight

## Code Style

**Naming**: Components (PascalCase) | Hooks (`use` prefix) | Constants (UPPER_SNAKE_CASE) | Utilities (camelCase)

Keep functions < 50 lines. Check `src/types/` for existing types before creating new ones.

## Key Libraries

`@supabase/supabase-js` (database) | `uuid` (ID generation) | `@mui/material` + `@mui/icons-material` (UI)

External APIs: Google Gemini (flashcard generation) | Unsplash (card images)

## Testing

**Unit tests**: Vitest + React Testing Library. Test files live in `__tests__/` directories next to the source they cover (e.g. `src/hooks/__tests__/useShop.test.ts`).

**E2E tests**: Playwright. Tests live in `e2e/smoke/` and run against a dev server (`pnpm dev` must be running). Covers navigation, auth flows, accessibility, and public deck embeds.

**Scripts**:

- `pnpm test` — watch mode
- `pnpm test:run` — single run, no coverage
- `pnpm test:summary` — run with coverage, print only totals (**use this for a quick check**)
- `pnpm test:coverage` — full coverage table with per-file breakdown
- `pnpm test:e2e` — Playwright E2E smoke tests (requires `pnpm dev` running)

**Coverage thresholds** are enforced in `vitest.config.ts` (statements 70%, branches 60%, functions 65%, lines 75%). `pnpm test:coverage` will fail if any threshold is breached.

### What to test for every new feature or change

| Area                                                                            | Test it                                                                         | Skip it                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Pure functions** — XP math, formatters, validators                            | Yes — always. No mocks needed, highest ROI                                      | —                                                                                                |
| **Hook logic** — CRUD actions, optimistic updates, rollback                     | Yes — mock `@/lib/supabase` directly, test the state changes                    | Don't test the Supabase queries themselves, that's the DB layer's job                            |
| **DB adapter functions** (`lib/supabase.ts`)                                    | Yes — mock `@supabase/supabase-js`. Verify happy path + error path per function | Don't test internal helpers (`dbCardToApp` etc.) directly; they're covered by the function tests |
| **Context providers** — auth state, XP animation, settings                      | Yes — test via `renderHook` with the real provider as wrapper                   | Don't render full pages to test context                                                          |
| **Critical UI interactions** — form submit, button callbacks, answer validation | Yes — `fireEvent` or `userEvent`, assert the right handler was called           | Don't test MUI rendering details (classes, colors, sx props)                                     |
| **Animation / canvas components**                                               | No — mock them as `() => null` in consumer tests                                | —                                                                                                |
| **One-line wrappers** and thin context bridges                                  | No — coverage via consumers is enough                                           | —                                                                                                |

### Mock patterns

```ts
// Supabase DB functions — mock the whole module
vi.mock('@/lib/supabase', () => ({ sb: { auth: ..., from: ... }, isConfigured: vi.fn(() => true) }));

// Hooks used by components — mock the hook module
vi.mock('@/hooks/useProgress', () => ({ useProgress: () => ({ startSession: vi.fn(), ... }) }));

// Heavy/animated child components — stub to null
vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));

// requireOrganizerAccount — pass through for API route tests
vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({ id: 'org1', username: 'organizer', account_type: 'organizer' }),
}));
```

When testing a hook that makes Supabase calls, use the **thenable chain** pattern from `src/lib/__tests__/supabase.db.test.ts` so `await sb.from(...).select()...` resolves correctly.

### One rule

**New feature = new `__tests__` file (or additions to the existing one).** If you add a hook, add tests for its action functions. If you add a DB function to `lib/supabase.ts`, add it to `supabase.db.test.ts`. Run `pnpm test:summary` before and after to confirm coverage hasn't dropped.
