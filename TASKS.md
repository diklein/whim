# Whim tasks

Build order from `docs/spec.md`. Six hours. Check items off as they land. If behind, cut from the cut list in order.

## Hour 1: foundation (capture capped at 45 min)

- [x] Scaffold Next.js App Router app, package name `whim`, TypeScript, Tailwind v4, shadcn/ui
- [x] Env: `DATABASE_URL`, `BLOB_STORE_ID` + OIDC (no RW token needed), `WHIM_TOKEN`; AI Gateway auth via OIDC on Vercel
- [x] Neon schema: `turns`, `subjects`, `versions`, `fonts` (Drizzle, `drizzle-kit push`)
- [x] Seed data covering every subject kind
  - [x] Component: sidebar, several versions across turns
  - [x] Asset: logo exploration set, six SVGs from one turn
  - [x] Text: empty-state headline, several revisions
  - [x] Color: palette, token names stable across versions
  - [x] Turns with prompts and summaries that read as real
- [x] Minimal capture hook: prompt + changed text files and images → `POST /api/ingest` with bearer token
  - [x] UserPromptSubmit hook writes `.whim/pending.json`
  - [x] Stop hook snapshots to `refs/whim/snapshots`, diffs against previous, posts payload
  - [x] `whim.config.json` with endpoint, token env var name, include globs
  - [x] `/api/ingest` validates with Zod, writes files to Blob, rows to Neon, returns turn id
  - [x] Upload failure keeps payload locally and retries on next turn
- [x] Stop capture at 45 min; log what is left here

## Hour 2: AI layer

- [x] One structured call per turn via AI SDK + AI Gateway, Zod schema (`generateText` + `Output.object` in SDK v7)
- [x] Input: prompt, truncated diff, changed paths, existing subjects, `data-whim` slugs
- [x] Output: summary + subjects touched (slug, name, kind, parent, change type)
- [x] Stable names: reuse slugs, prefer `data-whim`, nest at most two levels
- [x] Turn status: capturing → summarizing → ready / failed
- [x] Failure path: turn lands with prompt and diff, summary shows a retry
- [~] Subject rename and merge persist and feed future calls: current names are passed in; rename UI is on the cut list, merge not started

## Hours 3–4: core UI

- [x] Sidebar: project name + capture status dot, Live, Subjects by kind with one level of nesting and counts, Shelved, Setup
- [x] Subject view: grid, newest first, siblings from one turn grouped under their prompt
- [x] Hide passed filter
- [x] Cards: preview per kind (image, text ledger, swatch row), version and time, one-line summary, picked/passed badge
- [x] Card actions: Pick, Pass, Remove, Hold, Copy revert prompt, Copy code
- [x] Quiet buttons: ≥3:1 at rest, brighter on hover and focus-within, full strength on touch
- [x] Remove → trash with undo toast; trash kept 30 days
- [x] Revert prompt text with `aria-live` copy announcement
- [x] Keyboard: roving tabindex, arrows, P, X, ⌫, Space, C, B, Esc (G and ⌘K wait on stack view and search)
- [~] Canvas background: built, then removed from the toolbar with the B key on Oct 7. `canvas-control.tsx` is kept, unused, for a quieter home
- [x] Turn view: everything one prompt changed
- [ ] Search (⌘K) across prompts, summaries, copy, subject names (cut)

## Hour 4.5: compare

- [x] Hold versions, then Compare in 2-up
- [x] 3-up (on the cut list)
- [x] Onion skin in 2-up for images and components (on the cut list)
- [x] Picking one pane can pass the rest in one step
- [x] Decided: compare is its own route (`/compare?ids=`), so Esc and the back button leave it cleanly

## Hour 5: snapshots and Live

- [x] 30-minute spike: Playwright screenshots + DOM snapshots per `[data-whim]` element, skip unchanged hashes
  - [x] Fonts fetched once, uploaded to Blob by hash, CSS rewritten, open CORS headers
  - [ ] Fall back to screenshots only if it fights back
- [x] Live column at `/live` for Chrome split view
- [x] States: hook not connected (setup steps with copy buttons), waiting for first turn (listening animation + reduced-motion static), capturing → summarizing → ready, localhost unreachable note, AI failure retry
- [x] Polling for new turns

## Hour 6: polish and write-up

- [x] Accessibility pass: keyboard walk-through, focus visibility, screen reader labels, reduced motion
- [x] Performance pass: no layout shift, no `transition: all`, grid fast with many cards
- [ ] End-to-end install test in a fresh project: clone Whim, run it, paste the Setup prompt into Claude Code in another project, send one prompt, see it land. Not yet done; everything so far was tested on Whim tracking itself.
- [ ] Write-up from `docs/decisions.md` (debrief notes are in the final session summary)
- [x] Deploy to Vercel

## Cut if behind, in order

1. [x] Search (cut)
2. [ ] Onion skin
3. [ ] 3-up compare
4. [ ] Subject rename

## Stretch, in order

1. [ ] Stack view (Time Machine), G toggles grid and stack
2. [ ] Typography tokens as a subject kind
3. [ ] In-app Whim panel

## Left over from the UI, compare, and snapshot spike

- [ ] Live markup is only in Compare (M key). Cards still show screenshots; a per-card toggle would be cheap now that `/api/dom/:id` exists.
- [ ] DOM snapshots capture the element's HTML plus the page CSS, with root classes copied so next/font variables resolve. Images inside snapshots still point at the tracked app's origin.
- [ ] Element capture only runs when a turn changed at least one included file. It now opens every page in `urls`. Element states, widths, and dark mode remain out of scope.
- [ ] Removed versions have no trash view and no 30-day sweep yet. They are hidden and keep `removed_at`.
- [ ] Subject rename UI not built (cut). Names from the AI stay editable in the database only.
- [ ] App has no dark mode. The canvas presets are off the toolbar, so there is no dark surface to judge on right now.

## Left over from the Oct 7 UI pass

- [ ] Grid cells are 256px minimum, auto-fill, aligned to the top; no cell-size control yet.
- [ ] Screenshot width and height are not stored, so image cards cannot reserve their box before load. Store dimensions at ingest to remove the shift.
- [x] Summaries were rerun under the new prompt on Oct 7.
- [ ] Text versions the model created before Oct 7 have no copy and stay hidden; a rerun fills copy only when it is in that turn's diff.
- [ ] The group-by-turn header is gone from the subject grid. The turn is reachable from the time on each card.
- [x] Code-only versions are hidden everywhere and no longer counted in the sidebar.
- [ ] Element versions pruned by the AI layer are deleted, not trashed. A turn whose summary fails keeps every element version until a retry.
- [ ] The Tracker seed was removed on Oct 7; `pnpm db:seed` restores it without touching Whim's own history.

- [ ] The Turbopack dev server sometimes keeps serving a stale `globals.css` after edits (seen three times on Oct 7). Restarting `pnpm dev` fixes it; nothing in the app is affected.

- [x] Duplicate posts: a Stop with nothing changed since the last snapshot now records nothing, and prompts sent mid-turn are collected rather than overwritten, so the work is attributed to everything that was asked.

- [x] Setup prints the full `WHIM_TOKEN` only on localhost, or when `WHIM_SHOW_TOKEN=1` says the deployment is protected; otherwise it is masked. Deployment Protection still needs an `x-vercel-protection-bypass` header in the hook to coexist with ingest.

- [x] Uploads were silently rejected for an hour on Oct 7 (a 6 MB screenshot of the Live feed failed validation and took the whole prompt's payload with it). The hook now clips elements taller than 1600px and skips screenshots over 2.5 MB. The hook now logs every rejection, shrinks and retries on a size rejection, and reports its queue depth, which Live shows in red.

## Left over from the AI layer

- [ ] AI Gateway team is on the free tier: every Claude model is blocked. Sonnet 5.5 is primary with gateway fallbacks to gpt-5.2 and gemini-2.5-flash. Top up credits to get Claude summaries.
- [ ] Merge subjects (fold one slug into another) is not built.
- [ ] `data-whim` slugs are read from the diff only; the Playwright spike should also pass the slugs found on the page.

## Left over from capture (filled in at the 45-minute mark)

- [ ] First snapshot in a repo has no parent, so its changed-file list is empty. Decide whether the first turn should treat every included file as added, or stay empty (current).
- [ ] Ingest only creates versions for convention files (`explorations/**`, `copy.json`, `*.md`). Code changes land on the turn (diff + paths) and wait for the AI layer to name subjects.
- [x] Turns from the hook now get summarized after the ingest response via `after()`; failures go to `failed` and `POST /api/turns/:id/summarize` retries
- [x] Setup is a download (`/api/setup/hook`, a tar of `hook/*.mjs`) plus one prompt for Claude Code that installs the hook, config, settings, and CLAUDE.md snippet.
- [ ] Hook sends SVGs as text, PNG/JPG/WebP/GIF as base64, skips files over 200KB text / 2MB image. No tests.
- [ ] Repo has no commits and no remote. Setup and the README point at `https://github.com/diklein/whim` (override with `NEXT_PUBLIC_WHIM_REPO`); create that repo and push before sharing a deployment, or the hook URLs in the setup prompt will 404.
