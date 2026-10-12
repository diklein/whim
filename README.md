# Whim

Whim tracks how a project's design evolves, turn by turn, so going back is a click, not a guess.

**Live demo:** [whim.diklein.com](https://whim.diklein.com)

Each Claude Code turn in a tracked project becomes one snapshot: the prompt, what changed, a screenshot of every `data-whim` element, and a one-line summary. Whim shows that history by subject (the sidebar, the logo, a headline, a palette) so you can pick, reject, compare, and copy a prompt that restores any version.

## Run Whim

Whim is single-player: one copy, one project, one person. It runs on your machine; deploying it is optional.

1. **Clone and install.** `pnpm install`.
2. **Give it a database and a blob store.** Create `.env.local` with `DATABASE_URL` (a Neon Postgres) and `BLOB_STORE_ID` (a Vercel Blob store). The quickest way is a Vercel project with both from the Marketplace, then `vercel env pull .env.local`.
3. **Pick a token.** Add `WHIM_TOKEN=<any long random string>` to `.env.local`. The capture hook in your project will use the same value.
4. **Summaries need a model.** Whim calls Vercel AI Gateway; `WHIM_MODEL` defaults to `anthropic/claude-sonnet-5.5`, with `WHIM_FALLBACK_MODELS` as a comma list.
5. **Push the schema and start:** `pnpm db:push`, then `pnpm dev` and open http://localhost:3200.
6. **Open Setup in Whim.** It gives you one prompt to paste into Claude Code in the project you want to track. Claude installs the hook from `hook/` in this repo and asks for the token. The hook screenshots every page listed under `urls` in `whim.config.json` after each turn, so list the pages you iterate on.

Optional: `WHIM_PROJECT_NAME` for the name in the sidebar, `NEXT_PUBLIC_WHIM_REPO` to fetch the hook from a fork. To keep Whim running without your laptop, deploy the same repo to Vercel with the same environment variables, and set `WHIM_PASSWORD` there: every page then asks for it once (the hook's ingest route keeps using the token). Leave it unset on localhost and there is no gate.

`docs/spec.md` says what Whim is, `docs/decisions.md` says why, and `TASKS.md` is the build order.

## Layout

```
src/app            routes (App Router)
src/app/api/ingest hook endpoint, bearer token
src/components     UI; src/components/ui is shadcn output
src/db             schema, client, seed
src/lib            pure helpers
hook/              the capture hook installed into a tracked project
explorations/      this repo's own explorations (Whim tracks its own build)
docs/              spec, decisions
```
