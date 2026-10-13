# Whim decision log

Oct 6, 2026, kept current through Oct 12 · David Klein

Each decision records what was chosen, why, and what was given up, so the reasons survive the build.

## Product

| Decision | Why | Gave up |
| --- | --- | --- |
| Solve losing track of AI-generated iterations | A real, repeated pain: hand-built `/lab` pages with `-2` and `-3` names, and app icon versions scattered or overwritten | A settings redesign (too generic) and a Claude Code output viewer (a symptom, not the cause) |
| Single-player, for solo developers | It's the user I know and the version that fits a short build | Team views and analytics |
| Purpose: keep your flow when you change your mind | Going back is annoying and slow, more than scary | A broader "preserve your taste" pitch, kept as the deeper layer |
| History is for ten-second moments, not browsing | Answers "will anyone look at this?" Memory products fail by over-applying, not by forgetting | A chronological archive as the main view |
| Track subjects: components, patterns, text, palettes, assets | Matches how designers think about what they changed | Element states, responsive widths, dark mode, motion (later) |
| Pick, Pass, and Remove as separate actions | Pass shelves an idea for later; Remove clears junk | A single reject action |
| Restore by copying an exact prompt | Works with any agent, needs no extra setup, stays web-only | Two-way restore through Claude Code channels (research preview, extra setup) |
| Learning how I decide stays in "with more time" | Hard to make credible in a short build, and risky if it over-applies | The AI "taste" angle in the build |
| Keep the hook out of the spotlight | The product is the history and comparison design, not the plumbing | Time spent perfecting capture |

## Design

| Decision | Why | Gave up |
| --- | --- | --- |
| Two axes: subjects in the sidebar, turns in Live | People look for "what changed" and "when" in different moments | A single timeline of everything |
| No whole-day timeline as the primary view | Rewind and Recall show a global timeline answers "where was I," not "which version was better" | Scrubbing through all activity |
| Grid first, Time Machine stack as the signature stretch | The grid is robust, accessible, and quick to scan; the stack is the memorable moment | Leading with the stack |
| One navigation model, a lens per type | You judge a sentence, a color, and a sidebar differently | A uniform card for everything |
| Text as a revision ledger with inline edits | Copy is read, not glanced at | Stacked text cards |
| Palettes as swatch rows aligned by token name | Reading down a column shows how one color changed | Freeform swatch groups |
| Compare as a mode, capped at three | Past three you are surveying, which the grid already does | Comparing four or more at once |
| Keyboard model from photo culling (P, X, arrows) | Fast reviewers keep their hands on keys and judge relatively | A mouse-only flow |
| Undo toast instead of confirm dialogs | Nothing is ever lost, so confirmation only adds friction | The safety of a confirm |
| Quiet buttons that brighten on hover and focus | Calm grid, no hidden actions, works for touch and keyboard | Hover-only actions |
| Canvas background control per subject | Icons and components must be judged on the background they will live on | A fixed neutral canvas |
| Live arrives in pieces: prompt, then visual, then summary | Feels live even while the model is working | Waiting for a complete update |
| A turn that is still being captured or written up shows a card-shaped skeleton instead of a status pill | The pill named a state; the placeholder shows where the result will land and reads as progress. Failed keeps its pill and a Retry | The words "Capturing" and "Summarizing" in the feed |
| The turn page reads top to bottom: when, what changed as the title, what was asked as the subtitle, then What changed, Files, and Diff as ruled sections with counts | The old page led with the prompt in quotes and scattered the status, time, and sha across one line; the summary is the headline, the prompt is context | The prompt as the headline |
| One loading skeleton per page type, drawn to the real page's widths and rhythm; `/dev/skeletons` shows them all in development | A generic block skeleton still caused a jump when content landed; the right skeleton makes the wait read as the page arriving | One shared placeholder |
| The prompt page shows no rules, larger section headings, the diff open, and no prompt text | The prompt text is on Live and in the sidebar's history; the page is for the result | Collapsing a long diff |
| A summary describes design, never behavior; a behavior-only turn is summarized as "No visible design change." | "Live now redirects to Setup" is a feature, and it was shown on cards as if the cards changed | A sentence for every turn |
| The word in the interface is "prompt", never "turn" | "Turn" is hook vocabulary; people send prompts | The spec's term, kept in code and docs |
| Setup's third step, shown until the first capture: "Send a prompt in your project", with a dashed waiting card and shimmering text instead of a pulsing dot | It is the last thing to do, so it reads as a step; the dot looked like a status light rather than an invitation | The listening animation on Setup (the slim Live column keeps it) |
| While waiting on Setup, the first captured prompt takes the person to Live on its own | A result that lands on another page while you stare at a waiting card is a result you miss | Staying on Setup after the first prompt |
| A development-only preview (`/api/preview?state=first-run`) shows the empty sidebar, Setup without a token, and Live redirecting, without touching data | Empty states are designed more often than they are seen | Nothing in production |
| Before anything is captured, the sidebar is a welcome: a waving hand, "Welcome to Whim", one line, no Live, no status, no footer | Live and Shelved are empty promises until the first prompt; a fresh install should read as one thing to do | A consistent sidebar across states |
| `/api/preview?state=first-prompt` shows the moment after the first prompt with something to show landed | The first real screen is the one that decides whether Whim makes sense; it is worth looking at without wiping data | Nothing in production |
| The model alone decides which changed captures are design changes; the prompt lists every element that rendered differently and says to leave out live data | An earlier rescue kept any capture whose file was in the diff. It let in sidebar and feed screenshots that differed only by a time or a status word, and those cards then borrowed the turn summary as a description about something else. With the "small is still design" rule the model claims a button variant flip on its own | A safety net for a change the model misses |
| Each version carries its own note from the model, and the card shows that before the turn summary | A turn that touched six things gave six cards the same sentence, so a reworded setup line was described as "status words get a green sweep" | One sentence per turn on every card |
| A subject's first version is always noted "First capture." and stays in its history | The first screenshot of a newly tagged element is the baseline the next version differs from; the model's note for it ("can now be tracked") described plumbing | Hiding baselines from Live, which would also hide genuinely new components |
| Chrome split view first, in-app panel later | Split view costs nothing; the panel needs extra plumbing | On-page highlighting of changed elements |
| Text versions show a word diff only when under 60% of the text changed; past that, the new text plain with a muted "Was" line | Interleaved old and new words read as gibberish on a rewrite; the diff is for edits | One consistent diff treatment |
| The turn summary sits on the group header, never on sibling cards | Six logo variants from one prompt should not repeat one sentence six times | A summary on every card |
| Compare is its own route with the first pane focused on entry | It is a mode you enter on purpose, so keys work immediately and Esc or the back button leaves it | Compare as an overlay on the grid |
| Held versions get a chip and an inset ring; focus gets an offset ring | Held and focused looked identical in the same blue | One ring style |
| Passed versions dim only their preview, never their text | Dimming the whole card dropped time and version labels below contrast | A simpler opacity on the card |
| Arrow keys pull focus into the grid when nothing is focused; letter keys do not | A reviewer can start culling without a Tab, and a stray P cannot pick anything by accident | Global letter shortcuts |
| No app dark mode in this build | The canvas presets already let versions be judged on dark; a second theme would cost time with no product gain | A dark app chrome |
| Muted text sits at oklch 0.47, badge text at 0.40–0.45 on 0.96 soft fills | axe measured the shadcn default muted token at 4.49:1, a hair under AA; every page now passes WCAG 2.1 AA with zero violations | The lighter, airier defaults |
| Production stays on the default `whim-omega.vercel.app` alias with Vercel Auth off for it (superseded by the password gate below) | The hook must POST without a browser session, and the spec has no accounts; the bearer token is the only gate | A login wall in front of the UI |
| Neutral light-gray chrome instead of the warm beige | The warm tint read as brown next to captured screenshots and competed with the work being judged; a zero-chroma gray stays out of the way | A touch of warmth in the app shell |
| "Rejected" replaces "Passed" in every label; the stored status stays `passed` | "Passed" read as "approved" to a first-time viewer; "Rejected" says what X does. Keeping the enum avoids a data migration mid-build | A one-word verb that matches the photo-culling vocabulary |
| Canvas background control removed from the toolbar, with the B key | It took the most prominent spot in the header for a setting used rarely; the idea is kept for a quieter home later | Judging a version on a dark or custom canvas, for now |
| The keystroke legend is gone from the toolbar; shortcuts live in tooltips | The legend was permanent chrome for a hint most people need once | Discoverability for keyboard-first reviewers |
| A logo mark (three stacked versions) replaces the plain wordmark; hook status moves to the bottom of the sidebar with a text label | The top of the sidebar is identity, not telemetry; a dot alone failed the color-only test, and "connected" is now green rather than a second color for idle | The last-turn timestamp, which the Live feed already shows |
| Sidebar sections collapse, with the state remembered per section | Projects with many subjects need a way to fold what is not being judged today; a chevron header also separates sections without extra ornament | A flat, always-open list |
| The grid is one flowing photo grid with the turn summary on each card, square cells, and the whole screenshot contained | One card per row under a prompt header wasted the width; the summary is the description a reviewer wants at a glance, and square cells keep tall sidebars whole | The prompt text on the group header, and the no-repeat rule for summaries across siblings (reverses the earlier row) |
| Rejected cards dim as a whole to 60%, with muted text stepped up to keep AA, and return to full strength on hover or focus | Dimming only the preview was too subtle to scan; stepping the muted token up inside the card keeps labels readable at the lower opacity | A uniform text color across cards |
| Text and swatch ledgers are centered in the main column | A left-hugging ledger left the right two thirds empty on wide screens | Edge alignment with the page title |
| The sidebar is the shadcn sidebar-07 block: identity tile on top with the hook status under the name, sentence-case section labels that collapse, an icon per subject by kind, Shelved and Setup in the footer, and a rail that collapses it to icons | A known model needs no explaining, collapses cleanly for small screens and for focus, and the block gave mobile, tooltips, and keyboard handling for free | The account switcher the block ships with, and the hand-rolled mobile menu |
| Screenshots render at natural size in cards, shrinking only when wider than the card | A 240px sidebar squeezed into a square cell was unreadable; at natural size it reads as the real thing | Uniform cell heights, and a reserved box until image dimensions are stored |
| AI summaries describe only the visible design change, under 12 words, in plain words | Summaries that named files and APIs read as commit messages on a design card | Implementation detail, which the turn view's diff still has |
| The sidebar never collapses to icons: no trigger, no rail; phones get a sheet behind a Menu button. Sections fold again from the label, remembered per section (re-added once the count column lined up) | Every collapse affordance was chrome in a column meant to be glanced at; the subject list is short enough to stay open | Icon mode on narrow desktop windows |
| The mark is a W drawn as one brush stroke | A stack of tiles read as a generic app icon; a brushed W says "design, by hand" and still works at 16px in one color | The three-versions metaphor |
| Code-only versions never render; a card needs a screenshot, image, text, or palette | A card showing a code snippet is not something to judge visually, and it broke the rhythm of the grid | Seeing that a turn touched a component before its screenshot landed |
| Cards in a grid share a row height; a preview taller than 32rem is centered and clipped to its middle | Uniform cards scan like a contact sheet; a 2000px feed screenshot would otherwise stretch its whole row | Seeing the whole of a very tall screenshot in the grid (Compare still shows it) |
| Live shows each turn's versions as full-size cards; the slim split-view column keeps chips | The feed is where a change is first judged, so it gets the same card as the subject view | A compact feed on wide screens |
| The Next dev indicator is off | It sat over the sidebar footer and showed up in Whim's own captures | The dev tools badge |
| Every empty view shows an icon in a soft circle above its title | A line of text alone read as an error; the icon says "nothing here yet" at a glance | Nothing |
| The mark is a calligraphic W: heavy downstrokes, thin upstrokes, a flick off the last stroke | The first brush W read as a bold sans W; pressure and a flick are what say "a brush made this" | A geometric mark that scales down more evenly |
| Any capture opens full screen at natural size on click, built on the shadcn Dialog stretched to the viewport | Tall and wide screenshots are clipped in the grid; the lightbox is where they are read in full. shadcn has no dedicated full-screen overlay, but Dialog is the right primitive for one | A dedicated overlay component |
| Whim's own subjects drop the "Whim" prefix from their names; slugs keep it | The app name repeated down the list said nothing; the slug prefix still keeps Whim's elements from colliding with a tracked project | Nothing |
| Whim tracks only itself in this database; the Tracker seed is gone and reseeding adds it back without touching captured history | Two projects in one sidebar produced two Sidebars and a Logo subject with both projects' files; the spec says one project | The fictional demo set, until `pnpm db:seed` restores it |
| Subject names are sentence case, from the slug and from the model | Title Case read as product names in a list of parts; sentence case reads as labels | Nothing |
| Card descriptions are 14px in the foreground color | 12px muted text was the one thing on a card people had to lean in for, and it is the line that says what changed | A quieter card |
| The full-screen overlay carries every card action in a bottom bar | Judging happens at full size; sending someone back to the grid to pick or reject broke the flow | A pure viewer |
| Live renders each turn's versions with the same interactive card as a subject page | One card, one set of actions, everywhere a version appears. The turn header keeps the prompt and shows the summary only when a turn has no cards | A read-only feed |
| The leftover `sidebar` subject (named by the model before Whim's own slugs got a prefix) was merged into `whim-sidebar` | Two Sidebars in one list for one component | Nothing |
| Live is one centered column, one card per row | A feed is read top to bottom; a grid of mixed subjects per turn asked the eye to scan sideways | Seeing a whole turn at a glance on a wide screen |
| Captures display at half their pixel width | The hook captures at 2x for crisp retina images; shown at pixel size they were twice life size | Nothing, since the scale is a constant in the hook |
| The overlay focuses the scrolling capture on open, not the first button | Autofocus on Pick popped its tooltip and put a destructive row one keypress away; arrow keys now scroll the capture | Immediate keyboard access to the actions (one Tab away) |
| Keys inside the full-screen overlay: Esc and arrows stay in the overlay; P, X and ⌫ act on the card that opened it | The overlay is a portal, so its keys bubbled to the grid and Esc navigated back a page | Arrow-key culling while the overlay is open |
| Hook status is a word, red when not connected, no dot | The dot duplicated the word, and red is the only state that needs attention | A pulse while capturing |
| The wide Live feed shows no prompt text and no commit sha; the time links to the turn | The prompt repeated what the cards and their descriptions already say, and the sha is plumbing. The slim split-view column keeps the prompt, since it has no cards | Reading the prompt in the feed; it is one click away on the turn page |
| "Connected" sweeps green once on first load | A quick, quiet confirmation that capture is working, then it settles. Static under reduced motion | Nothing |
| Setup is a token and one prompt for Claude Code; the hook download is gone from the page, since the prompt fetches the hook | Three copy-paste steps were the kind of plumbing the agent is for; the prompt carries the config, the hook registration, and the CLAUDE.md snippet | Hand-editing settings as the documented path |
| Setup steps are two flush sections with a "Step 1 / Step 2" eyebrow and a rule between them; the copy control sits in a toolbar above the prompt | Numbered bullets indented the content and the floating Copy button sat on the scrollbar | A numbered list |
| A fresh install opens on Setup; Live redirects there until the first turn lands, and Setup listens for it | The first thing to do is set up, so that is the selected page; the inline setup copy on Live was the same content twice | A Live page before there is anything live |
| Every sidebar item is a link; a parent's page shows its own versions and its parts' versions, each card naming its subject | A parent that was a label while its siblings were links read as random; a parent page that gathers its copy is the natural home for "what changed in the sidebar" | A parent page that shows only the parent |
| Copy nests under the component that contains it; the Text section only appears for copy that lives in no tagged element | A headline is judged in its sidebar, not in a list of headlines; the Text lens still renders, one level down | A flat list of every piece of copy |
| Setup shows the token with a Copy button when Whim has one, and a generator when it does not | Whim is single-player and runs locally; making someone open `.env.local` to read a value the page already knows was friction for nothing | Secrecy on a deployed, unprotected Whim: anyone who can open it can read the token, so a deployment should sit behind Vercel Deployment Protection (the hook would then need a bypass header, not built) |
| The hook's home is the GitHub repo; the setup prompt has Claude fetch the three files from `raw.githubusercontent.com`, with the deployment's tar as a fallback | A stranger sets up from the repo, not from someone's deployment; `NEXT_PUBLIC_WHIM_REPO` points a fork at itself | A single source |
| The mark is a soft painted "W.": rounded terminals, a slight wobble, one dabbed period, no bristles or droplets | The spiky version read as a splash, not a brush; the Blue Bottle mark shows how far a plain silhouette with soft edges goes | The splatter |
| Every change to user-facing copy becomes a text subject with its copy; a text version without copy never lands | Iterating on words is the point of the Text lens, and a version with nothing to read is noise | The record of a copy change the model could not quote |
| The hook ships as a tar built in a route handler with no dependency | One link, works on every OS, and the deploy carries `hook/**` through output file tracing | A zip |
| Compare is its own full-screen route, with the same labels as cards and no quoted prompt | A mode you enter on purpose deserves the whole screen; one vocabulary everywhere | The sidebar while comparing |
| Entering compare prefetches as soon as two versions are held, and loads with one numbered SQL query | The route was compiled and fetched only on click; the fetch ran two round trips | Nothing |
| Captures show at half pixel width; assets at natural size, enlarged to 160px when smaller | A 24px icon exploration was unjudgeable at 12px; captures were twice life size | A single sizing rule |
| Every card has a description: the summary, "Writing description…" while the turn is being written up, or a Retry when it failed. Subject pages poll while a turn is pending | A blank card looked broken; the gap was the moment between capture and summary | A static page while summaries land |
| The model fills text subjects' copy from the diff, so code-only copy changes still render as a ledger | The Text section vanished once the seed left; Whim's own copy lives in code, not copy.json | Text versions without their copy |
| The mark is "W." in black on a white tile: bristle splits and a splat, no dry-brush gaps, filling the tile | Gaps read as highlights at small sizes; the blue tile competed with the blue accent | The blue tile |
| Where a subject lives shows once, in the subject header ("On /, /setup and /subjects/whim-sidebar"), not on cards | A page is a property of the thing, not of each change; repeating it per card is noise. The hook records every configured page a slug appears on and ingest keeps the latest set on the subject, so it fills without a new version. Copy nested under a component inherits its parent's pages | "On every page" wording (the server does not know the configured list); per-version page history |
| Rejected cards fade only their picture, not the whole card | Dimming the card took the badge and time below 3:1; fading the preview keeps the "stepped back" reading with every label at full contrast | The lighter look of a fully faded card |
| Escape in the grid clears the held set and otherwise does nothing | Escape as "go back" sent keyboard users to whatever page came before, sometimes Setup. Compare keeps Escape as close because it is a full-screen mode | A one-key way back from a subject page |


## Engineering

| Decision | Why | Gave up |
| --- | --- | --- |
| Capture with hooks, not AI-written summary files | Exact and passive after one-time setup; no layer of re-summarizing | Simpler setup, and the agent's judgment about what matters |
| One snapshot per turn (prompt plus Stop hooks), not per file write | Catches files made by any tool, including exported PNGs, and pairs each change with its prompt | Finer-grained, per-edit history |
| Hidden git ref with a temporary index | Full project state each turn without touching the user's branches | Simpler file uploads |
| `data-whim` attributes on UI | Deterministic element identity and stable subject names | Zero changes to the user's markup |
| An explorations folder and palette JSON | Gives assets and palettes a predictable home Whim can render | Capturing files saved anywhere |
| No per-turn preview deployments | Too slow for Live mode and too much plumbing in the critical path | Old states as fully running apps |
| Live view of old iterations through DOM snapshots, with screenshots as thumbnails | Real markup without deploying: zoomable, selectable, with hover and focus styles | JavaScript behavior in old versions |
| Fonts uploaded to Blob once, identified by content hash, and served with open cross-origin headers | Each version renders in the exact font it used, without bloating every snapshot | Domain-locked web fonts such as Adobe Fonts, which fall back to the screenshot with a note |
| Skip screenshots whose image hash is unchanged | Keeps only changed elements without mapping source to elements | Precise change attribution |
| One structured AI call per turn via the AI SDK and AI Gateway | Summaries and subjects in one step; passing existing subjects keeps names stable | Multi-step classification |
| Polling instead of websockets | Fits Vercel's serverless model and keeps things simple | Instant push |
| Neon for rows, Blob for images, three tables | Matches the turn, subject, and version model | A heavier schema |
| One token in an environment variable, no accounts | Single-player and fast to build | Multi-user support |
| Capture capped at 45 minutes, with seed data | Keeps the UI unblocked | Perfect capture on day one |
| Drizzle ORM with `drizzle-kit push`, no migration files | Typed schema and queries in minutes; push keeps a short build moving | Migration history and rollback |
| Whim tracks its own build: the setup snippet lives in Whim's own `CLAUDE.md` | Real history for the demo and a live test of the conventions | A clean separation between the tool and its first project |
| Single-letter shortcuts fire only with focus inside the grid, never in a text field | Avoids stealing keys from search and rename inputs; roving tabindex keeps one tab stop | Global hotkeys from anywhere on the page |
| Blob authenticated by the Vercel OIDC token and `BLOB_STORE_ID`, no read-write token | `vercel env pull` and the deploy both carry it, so there is one less secret to manage | Running the seed from a machine that has never run `vercel link` |
| The diff and changed paths are stored on the turn row | The AI layer can retry from the database, and the turn view can show the change without re-reading git | A leaner `turns` table |
| Ingest maps convention files to subjects deterministically before any AI runs | `explorations/<subject>/`, palette JSON, and copy files have an obvious owner, so those versions land instantly and never depend on the model | Letting the model name every subject |
| Hook failures are swallowed and written to `.whim/last-error.log` | A capture bug must never block a Claude Code turn, but it should still be diagnosable | Loud errors in the terminal |
| Whim's dev server is pinned to port 3200 | Ports 3000 and 3100 are taken by other local projects, and the hook endpoint in `whim.config.json` must not drift when Next picks a free port | The default port |
| Seed data is a fictional project called Tracker, not Whim itself | A second project makes the demo read as a real tool rather than a mirror, and it exercises every subject kind on day one | Whim's own history as the only demo content |
| The AI layer runs in `after()` once the ingest response is sent | The hook returns in under a second, and the turn visibly moves capturing → summarizing → ready, which is the Live design | Knowing the summary succeeded before replying to the hook |
| Sonnet 5.5 as the summary model, with gateway fallbacks to gpt-5.2 and gemini-2.5-flash | The team's AI Gateway is on the free tier, which blocks Claude; fallbacks keep summaries flowing today and switch to Sonnet the moment credits exist | One predictable model for every summary |
| The model must copy code snippets verbatim from the diff or return null | An early run invented a snippet; a fabricated revert prompt is worse than none | Richer snippets when the diff is truncated |
| Subject recency is recomputed from the versions table after every summary | Counts stay honest across retries and reruns | A cheaper increment |
| Structured output via `generateText` + `Output.object` | That is the AI SDK v7 API; the spec's `generateObject` is the older name | Nothing |
| Cache Components stay on; every page wraps its data in Suspense with a skeleton | The shell prerenders and streams, which is the right performance shape, and the skeleton holds layout | A simpler `force-dynamic` |
| A new component subject needs a `data-whim` slug behind it; the AI may only name existing subjects or convention-file subjects | The model kept inventing subjects from refactored code files; capture decides what exists, AI only labels | Letting the model discover components from code |
| DOM snapshots and fonts are served through Whim (`/api/dom/:id`, `/api/font/:hash`), not straight from Blob | Blob sends HTML as an attachment with a locked-down CSP, so iframes cannot render it; the proxy adds a scripts-off CSP and immutable caching | Zero-hop snapshot serving |
| The hook fetches `@font-face` files itself and ships them with the payload | Whim's server cannot reach localhost; the hook is the only thing that can read the dev server's fonts | A server-side font fetch |
| Snapshots copy the `html` and `body` classes from the captured page | next/font and theme tokens live on root classes; without them snapshots fell back to serif | A snapshot of only the element |
| Whim's own UI uses `whim-` prefixed slugs | Whim tracks itself in the same database as the Tracker seed, so a bare `sidebar` would merge two products | Spec-style bare slugs in Whim's own markup |
| Element capture runs in the Stop hook with Playwright resolved from the tracked project, and skips silently if it is missing | Keeps capture optional and the hook dependency-free; the 45-minute rule still holds | Bundling a browser with the hook |
| The hook captures a list of pages (`urls`), not one; an element seen on an earlier page is not captured again | A button restyled on Setup never produced a version because only the home page was screenshotted; variant changes are visual, so they need a screenshot | One page load per turn (now one per listed page) |
| The hook never queues a rejected upload blindly: it logs Whim's reply, drops the largest screenshot on a size rejection and retries, and tells Whim how many prompts are still queued; Whim shows that in red on Live | Uploads failed silently for an hour on Oct 7 while the sidebar said "Capturing"; a capture tool that loses iterations without saying so has failed at its only job | A lean hook with no retry logic |
| A Stop with no change since the last snapshot records nothing; prompts sent mid-turn accumulate and post together | Nine identical prompts with empty diffs landed in one minute; and when several messages arrive before the agent stops, the work belongs to all of them | A record of prompts that changed no file |
| Setup prints the token only on localhost, or with `WHIM_SHOW_TOKEN=1`; deployed, it is masked to a prefix | Single-player and local by default, but a public deployment must not hand out the one secret that gates ingest | One-click copy on an unprotected deployment |
| Shared controls that get restyled carry their own `data-whim` (the Setup Copy button is `whim-copy-button`) | A button inside a tagged block only shows up inside that block's capture; its own history needs its own tag | Fewer tags |
| Subject view runs its parent, children, and versions queries in parallel after the subject lookup, and no longer loads the palette | Each Drizzle call is one HTTP round trip to Neon; five in sequence made switching subjects feel slow. Two round trips now | Nothing |
| The sticky element is the sidebar wrapper, not the nav inside it | A sticky nav inside a block-height wrapper had no room to stick, so the sidebar scrolled away with the page | Nothing |
| The sidebar lists only subjects with a version that renders, with counts from the same rule | A subject with a "1" and an empty page was the code-only version leaking into the count | Seeing a subject the moment capture names it, before it has a picture |
| After labeling, the AI layer deletes this turn's element versions for subjects it did not claim | Element capture fires on any pixel change, so the hook status and sidebar produced a version every turn with a description about something else. The model has the diff and decides what was designed differently | A screenshot for a change the model misses; the turn's diff is still there |
| Reads are `use cache` functions tagged `whim`; actions call `updateTag`, routes call `revalidateTag` | A Neon query is 80 to 340 ms from here, and each page ran two to five. Cached reads make clicking around the sidebar a cache hit until something changes | Reads that are always fresh without a tag |
| Each view's queries run in one parallel batch keyed off the slug | One round trip instead of two to five | Nothing |
| Server pages that print relative times call `connection()` first and read the clock once through `nowMs()` | With reads cached, nothing else made those renders dynamic, so Next flagged `Date.now()` during prerender; the React purity lint flags a bare `Date.now()` in render | A bare `Date.now()` |
| The sidebar is one `nav` landmark named Whim, and counts carry sr-only units ("Sidebar, 15 versions") | VoiceOver's rotor lists landmarks; without one the sidebar was loose content. A bare number after a link name reads as part of the name | Nothing |
| Captures store their on-screen width and height; cards reserve the box from them | The guideline audit's one visible flaw was layout shift as screenshots loaded. The hook already measured every element, so this is two columns and two attributes. Older rows were backfilled from the PNG headers | File assets (SVGs in explorations) still size on load |
| `@axe-core/playwright` as a dev dependency, behind `pnpm a11y` | Accessibility is a requirement in CLAUDE.md, and an audit that can be rerun after every change is worth more than one pass by hand. Playwright was already here for the hook | Nothing at runtime |
| A deployed Whim asks for one password (`WHIM_PASSWORD`), kept in a cookie for a month | A deployed Whim needs a URL other people can open; Vercel Authentication blocks them and Password Protection is a paid add-on; the ingest route and hook download stay token-only so capture keeps working | Per-person access and a way to change the password without a redeploy |


## Open decisions

- **DOM snapshot time box:** resolved. The spike took about 40 minutes including the Blob proxy and font plumbing, and live markup works in Compare.
- **Fonts and images in snapshots:** fonts are uploaded once by hash and proxied; images still reference the tracked app's origin.
- **Compare default:** resolved. Compare is its own route.
- **Trash retention:** whether removed versions really need 30 days, or less.
- **Subject depth:** whether two levels is enough once real projects are tracked.
