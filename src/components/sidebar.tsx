import { connection } from "next/server";
import { captureStatus, getSidebar, KIND_GROUPS } from "@/db/queries";
import { previewState } from "@/lib/preview";
import { getTurns } from "@/db/queries";
import type { SidebarSubject } from "@/lib/types";
import { nowMs, relativeTime } from "@/lib/format";
import { AppSidebar } from "./app-sidebar";
import { Skeleton } from "./ui/skeleton";

const PROJECT = process.env.WHIM_PROJECT_NAME ?? "Whim";

/** Reads on the server, renders on the client: the sidebar needs the current path for its active state. */
export async function Sidebar() {
  const { roots, lastTurn, passedCount } = await getSidebar();
  await connection(); // status compares against the clock, so it is computed per request, not prerendered
  const preview = await previewState();
  if (preview === "first-run") return <AppSidebar project={PROJECT} capture="none" lastCapture={null} groups={[]} passedCount={0} />;
  let subjects = roots;
  let count = passedCount;
  if (preview === "first-prompt") {
    // Only what the first prompt with something to show produced, each with one change.
    const oldest = (await getTurns(500)).filter((t) => t.versions.length).at(-1);
    const upTo = oldest?.createdAt ?? new Date(0);
    const trim = (list: SidebarSubject[]): SidebarSubject[] =>
      list.filter((s) => s.firstChangedAt <= upTo).map((s) => ({ ...s, changeCount: 1, children: trim(s.children) }));
    subjects = trim(roots);
    count = 0;
  }
  const capture = captureStatus(lastTurn);
  const lastCapture = lastTurn ? relativeTime(lastTurn.createdAt, nowMs()) : null;
  const groups = KIND_GROUPS.map((g) => ({ label: g.label, subjects: subjects.filter((s) => g.kinds.includes(s.kind)) })).filter((g) => g.subjects.length);
  return <AppSidebar project={PROJECT} capture={preview === "first-prompt" ? "idle" : capture} lastCapture={preview === "first-prompt" ? "just now" : lastCapture} groups={groups} passedCount={count} />;
}

export function SidebarSkeleton() {
  return (
    <div className="hidden h-svh w-64 shrink-0 flex-col gap-6 bg-sidebar p-3 md:flex" aria-hidden="true">
      <div className="flex items-center gap-2 p-1">
        <Skeleton className="size-9 rounded-lg motion-reduce:animate-none" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-12 rounded motion-reduce:animate-none" />
          <Skeleton className="h-2.5 w-16 rounded motion-reduce:animate-none" />
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-md motion-reduce:animate-none" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24 rounded motion-reduce:animate-none" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-md motion-reduce:animate-none" />)}
      </div>
    </div>
  );
}
