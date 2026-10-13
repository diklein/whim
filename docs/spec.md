# Whim spec

Oct 6, 2026, as built through Oct 12 · David Klein

## Principles

Whim tracks how a project's design evolves, prompt by prompt, so going back is a click, not a guess.

- **Capture is deterministic; AI sits on top.** Hooks and git record what happened. AI writes summaries and names subjects, and every label is editable.
- **History stays quiet.** It shows up when asked for and is never pushed at the user.
- **Nothing disappears by accident.** Reject shelves a version; Remove sends it to a trash with undo.
- **One project, one person.** No accounts, teams, or analytics.

## Setup

Setup is a token and one prompt. Whim's Setup page shows the token (generated on first run, read from `WHIM_TOKEN` after that) and a prompt to paste into Claude Code in the project to track. Claude fetches the three hook files from the GitHub repo (`NEXT_PUBLIC_WHIM_REPO` points a fork at itself, and the deployment's `/api/setup/hook` tar is the fallback), writes `whim.config.json`, registers the hooks in `.claude/settings.json`, and adds this to the project's `CLAUDE.md`:

```
## Whim
- Tag each meaningful piece of UI with data-whim="<slug>" (for example sidebar, logo, new-project-cta). Keep slugs stable.
- Save explorations in /explorations/<subject>/, one file per variant.
- Save palettes as JSON in /explorations/palette/: {"name": "...", "colors": {"primary": "#d70000"}}
- Keep UI copy you are iterating on in .md files or copy.json.
```

`whim.config.json` holds `urls` (the localhost pages to screenshot), `endpoint` (Whim's ingest URL), `tokenEnv` (the name of the token variable) and `include` (globs for files worth tracking). Setup's last step, "Send a prompt in your project", waits for the first capture and then opens Live on its own.

## Capture pipeline

Each Claude Code prompt becomes one turn, so the unit of history is a prompt and the work it produced. The word in the interface is "prompt"; "turn" is hook and database vocabulary.

1. **Prompt submitted.** The UserPromptSubmit hook appends the prompt to `.whim/pending.json`. Several prompts sent before the agent stops are kept, in order, and attributed together.
2. **Turn ends.** The Stop hook runs the rest. A Stop with nothing changed since the last snapshot records nothing.
3. **Snapshot.** The hook records the whole project to `refs/whim/snapshots` without touching the working branch, using a temporary index (`GIT_INDEX_FILE`, `git add -A`, `git write-tree`, `git commit-tree`, `git update-ref`). This catches every changed file, whichever tool made it. A diff against the previous snapshot lists what changed; the diff is capped at 300 KB, text files at 200 KB and images at 2 MB.
4. **Element capture.** If Playwright resolves from the tracked project, the hook opens every page in `urls` and, for each `[data-whim]` element, saves a 2x screenshot clipped to 1600 px tall, plus a DOM snapshot: the element's rendered HTML, the page's CSS and the `html` and `body` classes, so old versions display as live markup. An element seen on an earlier page is not captured again, and an element whose screenshot hash is unchanged is skipped. Fonts referenced by `@font-face` are fetched by the hook and shipped by content hash. Without Playwright, capture is skipped silently.
5. **Ingest.** The hook posts the prompt, diff, changed files, screenshots, DOM snapshots and fonts to `/api/ingest` with a bearer token. Files go to Vercel Blob; rows go to Neon. Convention files map to subjects before any AI runs: `explorations/<subject>/` is that subject, palette JSON is the palette, and `.md` and `copy.json` files are text. If the upload is rejected, the hook logs Whim's reply to `.whim/last-error.log`, drops the largest screenshot on a size rejection and retries, and queues the payload for the next turn; Live shows the queue depth in red. Hook errors never block a Claude Code turn.
6. **Summarize.** Ingest answers the hook, then the AI layer runs in `after()`. The turn moves capturing, then summarizing, then ready or failed.

## AI layer

One structured call per turn through the AI SDK and AI Gateway: `generateText` with `Output.object` and a Zod schema. The model is `WHIM_MODEL` (default `anthropic/claude-sonnet-5.5`) with gateway fallbacks from `WHIM_FALLBACK_MODELS` (default `openai/gpt-5.2,google/gemini-2.5-flash`).

- **Input:** the prompt, the truncated diff, changed file paths, the existing subjects (slug, name, kind, parent), the `data-whim` slugs found on the captured pages and in the diff, and which captured elements rendered differently this turn.
- **Output:** a summary of the visible design change in under 12 words, plus each subject touched, with slug, name, kind (component, pattern, text, color, asset), parent slug, change type (copy, color, layout, feature, asset), a per-version note, the copy for text subjects, and a code snippet copied verbatim from the diff or null.
- **Rules:** reuse existing slugs; a component subject needs a `data-whim` slug behind it, so the model names existing subjects and convention-file subjects but never invents one; copy nests under the component that contains it; nest at most two levels. A behavior-only turn is summarized as "No visible design change." and does not show in Live.
- **After labeling:** element versions for subjects the model did not claim are deleted, since element capture fires on any pixel change. Subject recency and counts are recomputed from the versions table.
- **Failure:** the turn lands with its prompt and diff, status `failed`, and every card offers a retry through `POST /api/turns/:id/summarize`.

## Data model (Neon)

Four tables: turns are the "when," subjects are the "what," versions join them, and fonts are stored once for every snapshot. Drizzle ORM with `drizzle-kit push`.

| Table | Columns | Notes |
| --- | --- | --- |
| `turns` | id, prompt, summary, snapshot\_sha, status, diff, changed\_paths, capture\_note, created\_at | Status is capturing, summarizing, ready or failed. The diff and paths stay on the row so the AI layer can retry from the database. `capture_note` says why element capture did not run, for example localhost unreachable. |
| `subjects` | id, slug, name, kind, parent\_id, last\_changed\_at, change\_count, pages | Kind is component, pattern, text, color or asset. `pages` lists the configured pages the subject was last seen on. |
| `versions` | id, subject\_id, turn\_id, blob\_url, dom\_snapshot\_url, text\_content, code\_snippet, file\_path, image\_hash, width, height, change\_type, status, removed\_at, note, created\_at | `blob_url` is the screenshot or image; `dom_snapshot_url` is the saved HTML and CSS. `width` and `height` let a card reserve its box before the image loads. Status is none, picked, passed or removed; the interface says Rejected for passed. |
| `fonts` | hash, blob\_url, family | Each font file is stored once and shared by every snapshot. |

An exploration set is the versions that share a subject and a turn, so siblings from one prompt need no extra table. DOM snapshots and fonts are served through Whim (`/api/dom/:id`, `/api/font/:hash`) with a scripts-off CSP, not straight from Blob. Reads are cached with `use cache` under one tag and invalidated on every write.

## Navigation and screens

Whim has two axes: subjects (what changed) and turns (when). The sidebar is the shadcn sidebar block, top to bottom:

- **Identity tile** with the project name (`WHIM_PROJECT_NAME`) and the hook status as a word under it: Connected, in green, or Not connected, in red.
- **Live:** the feed of prompts.
- **Subjects,** grouped by kind in collapsible sections (Components, Text, Colors, Assets), with children nested one level and a count per subject. Only subjects with a version that renders are listed. Copy nests under the component that contains it; the Text section holds copy that lives in no tagged element.
- **Shelved** and **Setup** in the footer.

Before anything is captured, the sidebar is a welcome and Live redirects to Setup. On phones the sidebar is a sheet behind a Menu button.

Screens:

- **Live (`/`):** one centered column, one card per prompt, newest first, with the same interactive card as a subject page. A prompt still being captured or written up shows a card-shaped skeleton; a failed one keeps a status pill and a Retry.
- **Subject (`/subjects/<slug>`):** a flowing photo grid, newest first, with a Hide rejected filter. A parent's page gathers its own versions and its parts', each card naming its subject. The header says which pages the subject lives on.
- **Prompt (`/turns/<id>`):** when, the summary as the title, the prompt as the subtitle, then What changed, Files and Diff.
- **Compare (`/compare?ids=`):** its own full-screen route, 2-up or 3-up from held versions, with onion skin in 2-up for images and components and live markup from the DOM snapshot where one exists. Entering compare prefetches as soon as two versions are held.
- **Shelved (`/shelved`):** every rejected version across subjects.
- **Setup (`/setup`):** the token and the prompt.
- **Full-screen viewer:** any capture opens at natural size on click, with every card action in a bottom bar.

## Interactions

- **Cards:** a preview per kind (image, text ledger with a word diff, swatch row aligned by token name), version and time, the version's own description, a Picked or Rejected badge, and actions: Pick, Reject, Remove, Hold, Copy revert prompt and Copy code. Captures show at half their pixel width; assets at natural size, enlarged to 160 px when smaller. Code-only versions never render.
- **Quiet buttons:** low weight by default but at least 3:1 contrast, brighter on hover and focus-within, full strength on touch screens, and only color and opacity change. Shortcuts live in tooltips.
- **Keys in the grid:** arrows move with a roving tabindex, P picks, X rejects, ⌫ removes with an undo toast, Space holds, C compares the held set, Esc clears it. Letter keys fire only with focus inside the grid and never in a text field; arrow keys pull focus into the grid when nothing is focused.
- **Keys in compare:** left and right arrows or 1 to 3 move between panes, P picks, X rejects, O toggles onion skin, M toggles live markup, Esc leaves. Picking one pane can reject the rest in one step.
- **Keys in the viewer:** Esc and arrows stay in the viewer; P, X and ⌫ act on the card that opened it.
- **Revert prompt:** "Restore \<subject> to Whim version \<n> (snapshot \<sha>). Its code is below. Change only this part." A copy is announced with `aria-live`.

## States

- **Hook not connected:** Setup shows the steps, each with a copy control, and the third step waits for the first prompt with a dashed card and shimmering text, static under reduced motion.
- **Live turn:** capturing, then summarizing, then ready. Cards appear with "Writing description…" and fill in when the summary lands. Subject pages poll while a turn is pending.
- **Localhost unreachable:** the screenshot step fails, but the prompt, summary and diff still land, and the turn carries a note naming the URL.
- **AI failure:** the turn lands without a summary and offers a retry.
- **Upload failure:** the hook keeps the payload in `.whim/queue` and sends it on the next turn; Live shows how many are waiting.
- **Removed:** hidden from every view and kept with `removed_at`. There is no trash view and no sweep yet.
- **Empty views:** an icon in a soft circle above the title.
- **Development previews:** `/api/preview?state=first-run` and `?state=first-prompt` show the fresh-install and first-result screens without touching data. `/dev/skeletons` shows every loading skeleton.

## Deployment

Whim is single-player and runs locally on port 3200. The same repo deploys to Vercel with the same environment variables, so capture keeps running without the laptop open. A deployed Whim asks for one password (`WHIM_PASSWORD`), kept in a cookie for a month, in front of every page; the ingest route and the hook download stay token-only so the hook keeps working. Setup prints the full token only on localhost, or with `WHIM_SHOW_TOKEN=1`; deployed, it is masked to a prefix. Blob is authenticated by the Vercel OIDC token and `BLOB_STORE_ID`, with no read-write token. Accessibility is audited with `pnpm a11y` (axe through Playwright); every page passes WCAG 2.1 AA.

## Not built

- Search across prompts, summaries, copy and subject names (the ⌘K palette was cut).
- The stack view (G to toggle grid and stack).
- The canvas background control (light, dark, checkerboard, custom; B to cycle). Built, then removed from the toolbar; the component is gone, the idea is kept for a quieter home.
- Subject rename and merge in the interface. Names from the model are editable in the database only.
- A trash view and the 30-day sweep for removed versions.
- An app dark mode.
- Image dimensions for file assets (SVGs in explorations), which still size on load.
- Images inside DOM snapshots still point at the tracked app's origin.
- A per-card toggle for live markup; it is only in Compare.
- An end-to-end install test in a fresh project. Everything so far was tested on Whim tracking itself.

## Out of scope (with more time)

- Element states, responsive widths and dark mode captures.
- Motion: looping clips of animated elements, plus easing curves Whim renders itself for side-by-side comparison.
- Typography tokens as a subject kind.
- An in-app panel that outlines the changed element on the page when a turn lands.
- On-demand preview deployments for rendering old snapshots as running code.
- Two-way restore through Claude Code channels.
- Learning how the user decides from picks and rejects, always visible and editable.
