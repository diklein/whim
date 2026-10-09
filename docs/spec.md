# Whim build spec

Oct 6, 2026 · @David Klein

## Principles

Whim tracks how a project's design evolves, turn by turn, so going back is a click, not a guess.

- **Capture is deterministic; AI sits on top.** Hooks and git record what happened. AI writes summaries and names subjects, and every label is editable.
- **History stays quiet.** It shows up when asked for and is never pushed at the user.
- **Nothing disappears by accident.** Pass shelves a version; Remove sends it to a trash with undo.
- **One project, one person.** No accounts, teams, or analytics.

## Setup conventions

Setup happens once: install two hooks, add a small config file, and paste a snippet into the project's `CLAUDE.md`.

```
## Whim
- Tag each meaningful piece of UI with data-whim="<slug>" (for example sidebar, logo, new-project-cta). Keep slugs stable.
- Save explorations in /explorations/<subject>/, one file per variant.
- Save palettes as JSON in /explorations/palette/: {"name": "...", "colors": {"primary": "#d70000"}}
- Keep UI copy you are iterating on in .md files or copy.json.
```

`whim.config.json` holds the localhost URL to screenshot, the Whim endpoint, the name of the token environment variable, and include globs for files worth tracking.

## Capture pipeline

Each Claude Code turn becomes one snapshot, so the unit of history is a prompt and the work it produced.

&#91;embedded content: capture pipeline · one turn, five steps\]

1. **Prompt submitted.** A hook writes the prompt to `.whim/pending.json`.
2. **Turn ends.** The Stop hook runs the rest of the pipeline. Capture stays deliberately simple: the product is the history and comparison, not the plumbing.
3. **Snapshot.** The hook records the whole project to `refs/whim/snapshots` without touching the working branch, using a temporary index (`GIT_INDEX_FILE`, `git add -A`, `git write-tree`, `git commit-tree`, `git update-ref`). This catches every changed file, whichever tool made it. A diff against the previous snapshot lists what changed.
4. **Element capture (added after the core UI works).** Playwright opens the configured URL. For every `[data-whim]` element, it saves a screenshot as the thumbnail, plus a DOM snapshot: the element's rendered HTML and the page's CSS, so old versions display as live markup. Elements whose screenshot hash is unchanged are skipped. Fonts referenced by `@font-face` are fetched once, uploaded to Blob by content hash, and the saved CSS is rewritten to point at them, served with open cross-origin headers.
5. **Ingest.** The hook posts the prompt, diff, changed files, screenshots, and DOM snapshots to `/api/ingest` with a bearer token. Files go to Vercel Blob; rows go to Neon.
6. **Summarize.** The AI layer runs and the turn becomes ready.

## AI layer

One structured call per turn through the AI SDK and AI Gateway, using `generateObject` with a Zod schema.

- **Input:** the prompt, a truncated diff, changed file paths, the existing subjects (slugs and names), and the `data-whim` slugs found on the page.
- **Output:** a one-sentence summary, plus each subject touched, with slug, name, kind (component, pattern, text, color, asset), parent slug, and change type (copy, color, layout, feature, asset).
- **Stable names:** reuse existing slugs, prefer `data-whim` slugs, and nest at most two levels.
- **User edits win:** renames and merges are saved and passed into future calls.
- **Failure:** the turn still lands with its prompt and diff, and the summary shows a retry.

## Data model (Neon)

Four tables cover it: turns are the "when," subjects are the "what," versions join them, and fonts are stored once for every snapshot.

| Table | Columns | Notes |
| --- | --- | --- |
| `turns` | id, prompt, summary, snapshot\_sha, status, created\_at | Status moves through capturing, summarizing, ready, or failed. |
| `subjects` | id, slug, name, kind, parent\_id, last\_changed\_at, change\_count | Kind is component, pattern, text, color, or asset. The last two columns drive recency ordering. |
| `versions` | id, subject\_id, turn\_id, blob\_url, dom\_snapshot\_url, text\_content, code\_snippet, file\_path, image\_hash, status, removed\_at, note, created\_at | `blob_url` is the screenshot or image; `dom_snapshot_url` is the saved HTML and CSS for live markup. Status is none, picked, passed, or removed. |
| `fonts` | hash, blob\_url, family | Each font file is stored once and shared by every snapshot. |

An exploration set is simply the versions that share a subject and a turn, so siblings from one prompt need no extra table.

## Navigation and screens

Whim has two axes: subjects (what changed) and turns (when). The sidebar holds both, top to bottom:

- **Project name** with a capture-status dot showing whether the hook is working.
- **Search (⌘K)** across prompts, summaries, copy, and subject names.
- **Live:** the feed of turns.
- **Subjects,** grouped by kind (Components, Text, Colors, Assets), with children nested one level (Sidebar, then Logo, Links, and CTA), counts, and recent activity first.
- **Shelved:** every passed version across subjects.
- **Setup,** at the bottom: hook install and the `CLAUDE.md` snippet.

Screens:

- **Subject view:** grid by default, stack as a stretch goal, with a Hide passed filter.
- **Compare:** 2-up or 3-up from held versions, with onion skin in 2-up for images and components.
- **Turn view:** everything one prompt changed.
- **Live (`/live`):** a slim column for Chrome split view.

## Interactions

- **Grid:** newest first, with siblings from one turn grouped under their prompt.
- **Cards:** a preview (image, text, or swatches), version and time, a one-line summary, a picked or passed badge, and actions: Pick, Pass, Remove, Hold, Copy revert prompt, and Copy code.
- **Quiet buttons:** low weight by default but at least 3:1 contrast, brighter on hover and focus-within, full strength on touch screens, and only color and opacity change.
- **Canvas background:** the area behind the cards can be light, dark, a checkerboard for transparency, or a custom color, including any color from the project's palettes, so versions are judged against the background they will live on. B cycles the presets, and the choice is remembered per subject. Card borders adjust so cards stay distinct on any background.
- **Keys:** arrows move, P picks, X passes, ⌫ removes with an undo toast, Space holds, C compares, G toggles grid and stack, B cycles the canvas background, Esc goes back, and ⌘K searches.
- **Compare:** picking one pane can pass the rest in one step.
- **Revert prompt:** "Restore \<subject> to Whim version \<n> (snapshot \<sha>). Its code is below. Change only this part." A copy is announced with `aria-live`.

## States

- **Hook not connected:** the empty state shows the setup steps, each with a copy button.
- **Waiting for the first turn:** a small listening animation, with a static version when reduced motion is on.
- **Live turn:** capturing, then summarizing, then ready. The prompt and changed files appear instantly, screenshots a moment later, and the summary last.
- **Localhost unreachable:** the screenshot step fails, but the prompt, summary, and diff still land, with a clear note naming the URL.
- **AI failure:** the turn lands without a summary and offers a retry.
- **Upload failure:** the hook keeps the payload locally and retries on the next turn.
- **Removed:** hidden from every view and kept in a trash for 30 days before deletion.

## Build order (6 hours)

Seed data and a minimal hook come first, so the interface never waits on capture and Whim still records most of its own build.

1. **Hour 1:** scaffold the Next.js app (repo `Whim`, package name `whim`), the Neon schema, Blob, seed data for every subject kind, and a minimal hook that sends the prompt plus changed text files and images. Capture is capped at 45 minutes.
2. **Hour 2:** AI summary and subject tagging.
3. **Hours 3–4:** sidebar, subject grid, cards, Pick, Pass, Remove, copy prompts, keyboard navigation, and the canvas background.
4. **Hour 4.5:** compare in 2-up and 3-up.
5. **Hour 5:** a 30-minute spike on DOM snapshots and element screenshots, working end to end, falling back to screenshots only if it fights back. Then the Live column with its states and waiting animation.
6. **Hour 6:** polish, an accessibility and performance pass, a quick Tracker jam for demo content, and the write-up.

**Cut if behind, in order:** search, onion skin, 3-up, subject rename.

**Stretch, in order:** stack view, then typography tokens, then an in-app Whim panel.

## Out of scope (with more time)

- Element states, responsive widths, and dark mode captures.
- Motion: looping clips of animated elements, plus easing curves Whim renders itself for side-by-side comparison.
- An in-app panel that outlines the changed element on the page when a turn lands.
- On-demand preview deployments for rendering old snapshots as running code.
- Two-way restore through Claude Code channels.
- Learning how the user decides from picks and passes, always visible and editable.
