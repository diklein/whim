import { Suspense } from "react";
import { connection } from "next/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { getTurns } from "@/db/queries";
import { nowMs } from "@/lib/format";
import { TurnFeed } from "@/components/turn-feed";
import { Poller } from "@/components/poller";
import { redirect } from "next/navigation";
import { previewState } from "@/lib/preview";

async function LivePageContent() {
  await connection(); // the feed shows "x min ago", so it renders per request
  const preview = await previewState();
  let turns = await getTurns(preview === "first-prompt" ? 500 : 60);
  const now = nowMs();
  // Nothing captured yet: a fresh install lands on Setup, with Setup selected in the sidebar.
  if (!turns.length || preview === "first-run") redirect("/setup");
  if (preview === "first-prompt") turns = turns.filter((t) => t.versions.length).slice(-1);
  // A prompt that produced nothing to look at is not news. Pending ones stay, as placeholders.
  turns = turns.filter((t) => t.versions.length || t.status === "capturing" || t.status === "summarizing" || t.status === "failed");
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-5 md:px-8">
      <Poller />
      <h1 className="sr-only">Live</h1>
      <TurnFeed turns={turns} now={now} />
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={<PageSkeleton kind="live" />}>
      <LivePageContent />
    </Suspense>
  );
}
