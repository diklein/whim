import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { getTurn } from "@/db/queries";
import { clockTime, nowMs, relativeTime, shortSha, tokenOrderFor } from "@/lib/format";
import { VersionGrid } from "@/components/version-grid";
import { StatusPill } from "@/components/turn-feed";
import { RetrySummary } from "@/components/retry-summary";
import { CopyButton } from "@/components/copy-button";

export const metadata: Metadata = { title: "Prompt" };

/**
 * One prompt, top to bottom: when, what changed as the title, then the versions it produced, the files it touched,
 * and the diff, open. The prompt text itself is not repeated here; the cards and the diff are the record.
 */
async function TurnPageContent({ params }: PageProps<"/turns/[id]">) {
  const { id } = await params;
  const data = await getTurn(id);
  await connection(); // relative times depend on the clock
  if (!data) notFound();
  const { turn, items } = data;
  const now = nowMs();
  const pending = turn.status === "capturing" || turn.status === "summarizing";
  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-6 md:px-8" data-whim="whim-turn-page">
      <header className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <time dateTime={turn.createdAt.toISOString()} className="tabular-nums">{clockTime(turn.createdAt)} · {relativeTime(turn.createdAt, now)}</time>
          {turn.status === "failed" && <StatusPill status={turn.status} />}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-pretty">
          {turn.summary ?? (pending ? <span className="text-shimmer w-fit">Writing description…</span> : `Prompt at ${clockTime(turn.createdAt)}`)}
        </h1>
        {turn.status === "failed" && !turn.summary && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">No description. <RetrySummary turnId={turn.id} /></p>
        )}
      </header>

      <Section id="changed" title="What changed" count={items.length}>
        {items.length ? (
          <VersionGrid
            embedded
            kind="component"
            groups={[{ turnId: turn.id, prompt: turn.prompt, summary: turn.summary, turnStatus: turn.status, createdAt: turn.createdAt, items }]}
            tokenOrder={tokenOrderFor(items)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{pending ? "Captures are on their way." : "No visible design change from this prompt."}</p>
        )}
      </Section>

      {turn.changedPaths.length > 0 && (
        <Section id="files" title="Files" count={turn.changedPaths.length} aside={turn.snapshotSha ? <span className="font-mono text-xs text-muted-foreground">snapshot {shortSha(turn.snapshotSha)}</span> : null}>
          <ul className="columns-1 gap-8 font-mono text-xs leading-6 text-foreground/80 md:columns-2">
            {turn.changedPaths.map((p) => <li key={p} className="truncate">{p}</li>)}
          </ul>
        </Section>
      )}

      {turn.diff && (
        <Section id="diff" title="Diff" aside={<CopyButton text={turn.diff} label="Copy diff" size="xs" variant="secondary">Copy</CopyButton>}>
          <pre tabIndex={0} role="region" aria-label="Diff text" className="max-h-[70vh] overflow-auto rounded-lg border bg-card p-3 font-mono text-xs leading-relaxed">{turn.diff}</pre>
        </Section>
      )}
    </article>
  );
}

/** A titled section: small heading with an optional count, something on the right, then the content. */
function Section({ id, title, count, aside, children }: { id: string; title: string; count?: number; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-base font-semibold tracking-tight">
          {title}
          {count != null && <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{count}</span>}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function TurnPage(props: PageProps<"/turns/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton kind="prompt" />}>
      <TurnPageContent {...props} />
    </Suspense>
  );
}
