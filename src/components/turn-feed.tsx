import Link from "next/link";
import type { TurnSummary } from "@/lib/types";
import { clockTime, relativeTime } from "@/lib/format";
import { RetrySummary } from "./retry-summary";
import { VersionGrid } from "./version-grid";
import { tokenOrderFor } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

/** The feed of turns: prompt first, then what it touched, then the summary when the model is done. */
export function TurnFeed({ turns, now, slim = false }: { turns: TurnSummary[]; now: number; slim?: boolean }) {
  return (
    <ol className="flex flex-col" data-whim="whim-turn-feed">
      {turns.map((t, i) => (
        <li key={t.id} className={cn("border-b py-5", i === 0 && "fade-in")}>
          <article aria-labelledby={`t-${t.id}`} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {t.status === "failed" && <StatusPill status={t.status} />}
              <Link href={`/turns/${t.id}`} className="rounded-sm hover:text-foreground hover:underline underline-offset-4">
                <time dateTime={t.createdAt.toISOString()} className="tabular-nums">{clockTime(t.createdAt)} · {relativeTime(t.createdAt, now)}</time>
              </Link>
            </div>
            {/* The prompt is the turn's accessible name and the link to its page; on the wide feed the cards carry the story. */}
            <h2 id={`t-${t.id}`} className={cn("font-medium text-pretty", slim ? "text-sm" : "sr-only")}>
              {slim ? (
                <Link href={`/turns/${t.id}`} className="hover:underline underline-offset-4">
                  <q className="quotes-none">{t.prompt}</q>
                </Link>
              ) : (
                <q className="quotes-none">{t.prompt}</q>
              )}
            </h2>
            {t.status === "ready" && t.summary && (slim || !t.versions.length) && <p className="text-sm text-muted-foreground text-pretty">{t.summary}</p>}
            {/* A turn still being captured or written up, with nothing to show yet: a card-shaped placeholder holds the spot. */}
            {(t.status === "capturing" || t.status === "summarizing") && t.versions.length === 0 && <PendingCard slim={slim} />}
            {t.status === "failed" && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                Summary failed. <RetrySummary turnId={t.id} />
              </p>
            )}
            {t.captureNote && <p className="text-xs font-medium text-destructive">Capture problem: {t.captureNote}</p>}
            {!slim && t.versions.length > 0 && (
              <VersionGrid
                embedded
                single
                kind="component"
                groups={[{ turnId: t.id, prompt: t.prompt, summary: t.summary, turnStatus: t.status, createdAt: t.createdAt, items: t.versions }]}
                tokenOrder={tokenOrderFor(t.versions)}
              />
            )}
            {slim && t.subjects.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Subjects touched">
                {t.subjects.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/subjects/${s.slug}`} className="inline-flex items-center gap-1.5 rounded-md border bg-card py-0.5 pr-2 pl-0.5 text-xs text-foreground/90 hover:bg-muted">
                      {s.thumb ? (
                        /* eslint-disable-next-line @next/next/no-img-element -- content-addressed Blob SVG/PNG, box reserves size */
                        <img src={s.thumb} alt="" width={22} height={22} loading="lazy" decoding="async" className="size-[22px] rounded-[4px] object-contain" />
                      ) : (
                        <span aria-hidden="true" className="grid size-[22px] place-items-center rounded-[4px] bg-muted text-[10px] text-muted-foreground">{s.kind === "text" ? "Aa" : s.kind === "color" ? "◐" : "◻"}</span>
                      )}
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!slim && t.subjects.length === 0 && t.changedPaths.length > 0 && t.status === "ready" && (
              <p className="text-xs text-muted-foreground">{t.changedPaths.length} {t.changedPaths.length === 1 ? "file" : "files"} changed, no design subjects.</p>
            )}
          </article>
        </li>
      ))}
    </ol>
  );
}

function PendingCard({ slim }: { slim: boolean }) {
  return (
    <div role="status" aria-label="Capturing" className={cn("version-card canvas flex flex-col overflow-hidden rounded-lg bg-card", slim ? "mt-1" : "mt-1")} data-tone="light" data-whim="whim-pending-card">
      <div className={cn("grid place-items-center p-3", slim ? "min-h-28" : "min-h-40")}>
        <Skeleton className={cn("rounded-md motion-reduce:animate-none", slim ? "h-20 w-3/4" : "h-28 w-2/3")} />
      </div>
      <div className="flex flex-col gap-2 border-t px-3 py-3">
        <Skeleton className="h-3 w-24 motion-reduce:animate-none" />
        <Skeleton className="h-3 w-4/5 motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: TurnSummary["status"] }) {
  const live = status === "capturing" || status === "summarizing";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium", status === "ready" && "bg-muted text-muted-foreground", live && "bg-picked-soft text-picked", status === "failed" && "bg-destructive/10 text-[oklch(0.48_0.19_30)]")}>
      {live && <span className="relative grid size-2 place-items-center"><span className="listening absolute size-2 rounded-full bg-live/50" /><span className="size-1.5 rounded-full bg-live" /></span>}
      {status === "ready" ? "Ready" : status === "capturing" ? "Capturing" : status === "summarizing" ? "Summarizing" : "Failed"}
    </span>
  );
}
