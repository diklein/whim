# Whim

Whim tracks how a project's design evolves, turn by turn, so going back is a click, not a guess.

Read `docs/spec.md` (what) and `docs/decisions.md` (why) before changing anything. `TASKS.md` is the build order; check items off as they land. Six-hour budget.

## Stack

- Next.js (App Router), TypeScript strict, Tailwind v4. shadcn/ui on Radix for primitives.
- Data: Neon Postgres through `@neondatabase/serverless`, Drizzle ORM. Schema lives in `src/db/schema.ts` and is synced with `drizzle-kit push` (no migration files during the build).
- Files: Vercel Blob for screenshots, images, DOM snapshots, fonts. Address by content hash where possible.
- AI: AI SDK `generateObject` with a Zod schema, through AI Gateway. One structured call per turn.
- Deploys to Vercel. pnpm. Node 24.

## Layout

```
src/app            routes (App Router)
src/app/api/ingest hook endpoint, bearer token
src/components     UI; src/components/ui is shadcn output
src/db             schema, client, seed
src/lib            pure helpers: slugs, hashing, revert prompt text, keyboard model
hook/              the capture hook installed into a tracked project
explorations/      this repo's own explorations (Whim tracks its own build)
docs/              spec, decisions
```

## The plumbing rule

Design and product quality matter more than plumbing. The capture hook stays simple: the prompt plus changed text files and images, posted to `/api/ingest`. Capture work is capped at 45 minutes in hour 1. When a capture task fights back, stop, write what is left in `TASKS.md`, and return to the UI. Seed data exists so the interface never waits on the hook.

## Principles (from the spec)

- Capture is deterministic; AI sits on top. Every AI-written label is editable.
- History stays quiet. It appears when asked for and is never pushed at the user.
- Nothing disappears by accident. Reject shelves, Remove trashes with undo. No confirm dialogs.
- One project, one person. No accounts, teams, or analytics.

## Conventions

### Code

- Server Components by default. `"use client"` only where there is interaction.
- Reads happen in server components or route handlers. Mutations are server actions.
- Route handlers that touch Blob or the database run on the Node runtime.
- Validate every external input with Zod: ingest payloads, AI output, search params. Derive types from schemas.
- Compose components. Prefer children and slots over boolean prop piles.
- No new dependency without a reason worth a line in `docs/decisions.md`. The sidebar is the shadcn sidebar block (`src/components/ui/sidebar.tsx`); compose it, do not fork it.
- Polling, not websockets.
- Names: slugs are kebab-case and stable. Files are kebab-case. Components are PascalCase.

### Accessibility (a requirement, not polish)

- Semantic HTML first: `nav`, `main`, `ul`, real `button` and `a`. Headings in order.
- Everything reachable and operable by keyboard. Visible focus with `focus-visible`; never remove an outline without replacing it.
- The grid uses roving tabindex. Arrow keys move. Single-letter shortcuts fire only when focus is inside the grid and not in a text input.
- ARIA only where native semantics fall short. Announce copies, undo toasts, and status changes with `aria-live`.
- Every animation has a static fallback under `prefers-reduced-motion`.
- Quiet buttons: at least 3:1 contrast at rest, brighter on hover and `focus-within`, full strength on `pointer: coarse`. Only color and opacity change.
- Tap targets at least 44px on touch.

### Performance

- No layout shift. Thumbnails and cards reserve their dimensions.
- Transitions name their properties. Never `transition: all`. Animate only `transform` and `opacity`.
- The grid stays fast past 100 cards: paginate or window before it gets slow.
- The app's own fonts load through `next/font`. Snapshot fonts come from Blob.
- Avoid client-side waterfalls. Fetch on the server, pass data down.

### Design

- Calm by default. Fewer things, done well.
- One navigation model, a lens per subject kind: image card, text ledger with inline diff, swatch row aligned by token name.
- The canvas background is part of judgment. Cards must stay distinct on light, dark, checkerboard, and custom colors.
- Copy is terse and specific. Buttons are verbs: Pick, Reject, Remove, Hold, Compare. The stored status is still `passed`; only the copy says Reject.
- Nothing hidden behind hover alone.

### Keys

Arrows move · P pick · X reject · ⌫ remove with undo · Space hold · C compare · G grid/stack · Esc back · ⌘K search

## Decisions

When you make a choice the user should be able to explain, add a row to `docs/decisions.md` under Product, Design, or Engineering: what was chosen, why, and what was given up.

## Whim

Whim tracks its own build. Follow its setup conventions here too.

- Tag each meaningful piece of UI with `data-whim="<slug>"` (for example `whim-sidebar`, `whim-logo`, `whim-grid`, `whim-compare`). Keep slugs stable.
- Save explorations in `/explorations/<subject>/`, one file per variant.
- Save palettes as JSON in `/explorations/palette/`: `{"name": "...", "colors": {"primary": "#d70000"}}`
- Keep UI copy you are iterating on in `.md` files or `copy.json`.
