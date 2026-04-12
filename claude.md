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

## Component Patterns

- Add `'use client'` directive for interactive components
- Functional components with hooks; define `interface <ComponentName>Props {}`
- Extract data/logic into `src/hooks/`; use Context API to avoid prop drilling
- Performance: `React.memo()`, `useCallback` for stable refs, `useMemo` for expensive computations
- Composition over inheritance

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
- Check `isConfigured()` before making DB calls

**API routes** (`src/app/api/`):
- `/api/generate` — calls Google Gemini API to generate flashcard fields (POST)
- `/api/images` — fetches images from Unsplash by query (GET)
- `/api/furigana` — calls Google Gemini API to add furigana readings to Japanese text using `{kanji|reading}` format (POST)
- `/api/pdf-extract` — calls Google Gemini API to extract vocabulary from a PDF and generate full flashcard data (POST)
- `/api/public/deck/[id]` — public read-only endpoint to fetch a deck and its cards by ID without auth (GET)

**API client** (`src/services/api.ts`):
- `generateFlashcards()` — calls `/api/generate`
- `fetchImage()` — calls `/api/images`

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
