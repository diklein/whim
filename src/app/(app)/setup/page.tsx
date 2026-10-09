import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { PageSkeleton } from "@/components/page-skeleton";
import { SetupSteps } from "@/components/setup-steps";
import { Poller } from "@/components/poller";
import { AwaitingFirstPrompt, FirstPromptArrived } from "@/components/first-prompt-handoff";
import { getTurns } from "@/db/queries";
import { previewState } from "@/lib/preview";

export const metadata: Metadata = { title: "Setup" };

async function SetupPageContent() {
  const [h, turns, preview] = await Promise.all([headers(), getTurns(1), previewState()]);
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  // The development-only previews (/api/preview) show this page as a stranger sees it before and after the first prompt.
  const connected = turns.length > 0 && preview !== "first-run";
  const host = h.get("host") ?? "";
  // The full token prints on localhost. A deployment with no login would show it to anyone, so there it is
  // masked unless WHIM_SHOW_TOKEN=1 says the deployment is protected.
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
  const canShow = local || process.env.WHIM_SHOW_TOKEN === "1";
  const token = preview === "first-run" ? null : (process.env.WHIM_TOKEN ?? null);
  const shownToken = token && !canShow ? `${token.slice(0, 6)}…` : token;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-5 md:px-8">
      <header>
        <h1>Setup</h1>
      </header>
      <SetupSteps origin={origin} token={shownToken} tokenMasked={!!token && !canShow} whimDir={process.env.VERCEL ? null : process.cwd()} />
      {connected ? <FirstPromptArrived /> : <><Poller every={3000} /><AwaitingFirstPrompt /></>}
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<PageSkeleton kind="setup" />}>
      <SetupPageContent />
    </Suspense>
  );
}
