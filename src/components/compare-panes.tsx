"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BotIcon, CheckIcon, CodeIcon, XIcon } from "lucide-react";
import { pickAmong, setVersionStatus } from "@/lib/actions";
import { clockTime, copyableCode, relativeTime, revertPrompt } from "@/lib/format";
import type { VersionItem } from "@/lib/types";
import type { VersionStatus } from "@/db/schema";
import { Preview } from "./previews";
import { CopyButton } from "./copy-button";
import { StatusBadge } from "./version-card";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { TooltipProvider } from "./ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Compare as a mode, capped at three. 2-up gets an onion skin for images and components.
 * Picking one pane rejects the rest in one step.
 */
export function ComparePanes({ items: initial, tokenOrder, now }: { items: VersionItem[]; tokenOrder: string[]; now: number }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [status, setStatus] = useState<Record<string, VersionStatus>>(Object.fromEntries(initial.map((i) => [i.id, i.status])));
  const [focus, setFocus] = useState(0);
  const [onion, setOnion] = useState(false);
  const [alpha, setAlpha] = useState(0.5);
  const [markup, setMarkup] = useState(false);
  const panesRef = useRef<HTMLDivElement>(null);
  const items = initial.map((i) => ({ ...i, status: status[i.id] ?? i.status }));
  const subject = items.every((i) => i.subjectId === items[0].subjectId) ? items[0] : null;
  const canOnion = items.length === 2 && items.every((i) => i.blobUrl);
  const canMarkup = items.some((i) => i.domSnapshotUrl);
  const sameTurn = items.every((i) => i.turnId === items[0].turnId);

  // Compare is a mode the user entered on purpose, so the first pane takes focus and keys work at once.
  useEffect(() => {
    panesRef.current?.querySelector<HTMLElement>("[data-pane]")?.focus({ preventScroll: true });
  }, []);

  const focusPane = (i: number) => {
    const n = Math.max(0, Math.min(items.length - 1, i));
    setFocus(n);
    panesRef.current?.querySelectorAll<HTMLElement>("[data-pane]")[n]?.focus();
  };

  const pick = (item: VersionItem) => {
    const others = items.filter((i) => i.id !== item.id).map((i) => i.id);
    setStatus((s) => ({ ...s, [item.id]: "picked", ...Object.fromEntries(others.map((id) => [id, "passed" as const])) }));
    start(async () => {
      try {
        await pickAmong(item.id, others);
        toast.success(`Picked v${item.number}`, { description: others.length ? `Rejected ${others.length === 1 ? "the other" : "the others"}.` : undefined });
      } catch {
        toast.error("Could not save the pick.");
      }
    });
  };

  const pass = (item: VersionItem) => {
    const next: VersionStatus = item.status === "passed" ? "none" : "passed";
    setStatus((s) => ({ ...s, [item.id]: next }));
    start(() => setVersionStatus(item.id, next));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea, select")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "arrowleft") { e.preventDefault(); focusPane(focus - 1); }
    else if (k === "arrowright") { e.preventDefault(); focusPane(focus + 1); }
    else if (k === "p") { e.preventDefault(); pick(items[focus]); }
    else if (k === "x") { e.preventDefault(); pass(items[focus]); }
    else if (k === "o" && canOnion) { e.preventDefault(); setOnion((o) => !o); }
    else if (k === "m" && canMarkup) { e.preventDefault(); setMarkup((m) => !m); }
    else if (k === "escape") { e.preventDefault(); router.back(); }
    else if (/^[1-3]$/.test(k)) { e.preventDefault(); focusPane(Number(k) - 1); }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <main className="flex min-h-dvh flex-col bg-background" data-whim="whim-compare">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-3 md:px-8">
          <h1 className="text-lg font-semibold tracking-tight">
            Compare{subject && <> <span className="text-muted-foreground">·</span> <Link href={`/subjects/${subject.subjectSlug}`} className="hover:underline underline-offset-4">{subject.subjectName}</Link></>}
          </h1>
          {canOnion && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant={onion ? "secondary" : "ghost"} aria-pressed={onion} onClick={() => setOnion((o) => !o)}>
                Onion skin <Kbd aria-hidden="true">O</Kbd>
              </Button>
              {onion && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>v{items[1].number} over v{items[0].number}</span>
                  <input type="range" min={0} max={1} step={0.05} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} aria-label="Onion skin opacity" className="w-28 accent-primary" />
                </label>
              )}
            </div>
          )}
          {canMarkup && (
            <Button size="sm" variant={markup ? "secondary" : "ghost"} aria-pressed={markup} onClick={() => setMarkup((m) => !m)}>
              Live markup <Kbd aria-hidden="true">M</Kbd>
            </Button>
          )}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => router.back()} aria-label="Close compare">
            <XIcon aria-hidden="true" /> Close <Kbd aria-hidden="true">Esc</Kbd>
          </Button>
        </header>

        {sameTurn && items[0].summary && <p className="px-5 pt-3 text-sm text-pretty md:px-8">{items[0].summary}</p>}
        <div
          ref={panesRef}
          role="group"
          aria-label="Compared versions"
          onKeyDown={onKeyDown}
          data-tone="light"
          className={cn("canvas flex-1 px-5 pt-4 pb-10 md:px-8")}
        >
          <div className={cn("grid gap-4", items.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2")}>
            {items.map((item, i) => (
              <article
                key={item.id}
                data-pane
                tabIndex={i === focus ? 0 : -1}
                onFocus={() => setFocus(i)}
                aria-label={`Pane ${i + 1}: ${item.subjectName} version ${item.number}`}
                className="version-card flex flex-col overflow-hidden rounded-lg bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="relative">
                  {markup && item.domSnapshotUrl ? (
                    <iframe
                      src={`/api/dom/${item.id}`}
                      title={`Live markup of ${item.subjectName} version ${item.number}`}
                      sandbox=""
                      loading="lazy"
                      className="block w-full bg-transparent"
                      style={{ height: "min(60vh, 560px)" }}
                    />
                  ) : (
                    <Preview item={item} tokenOrder={tokenOrder} tone="light" size="large" />
                  )}
                  {onion && canOnion && i === 0 && (
                    <div className="pointer-events-none absolute inset-0 h-[min(60vh,560px)] p-4" style={{ opacity: alpha }} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element -- onion skin overlay of the other pane */}
                      <img src={items[1].blobUrl!} alt="" className="size-full object-contain" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 border-t px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-sm font-medium text-foreground tabular-nums">v{item.number}</span>
                    {item.status !== "none" && <StatusBadge status={item.status} />}
                    <time dateTime={item.createdAt.toISOString()} className="ml-auto tabular-nums">{clockTime(item.createdAt)} · {relativeTime(item.createdAt, now)}</time>
                  </div>
                  {!sameTurn && item.summary && <p className="text-sm text-pretty">{item.summary}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Button size="sm" onClick={() => pick(item)} disabled={item.status === "picked"}>
                      <CheckIcon aria-hidden="true" /> {item.status === "picked" ? "Picked" : "Pick"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => pass(item)} aria-pressed={item.status === "passed"}>
                      <XIcon aria-hidden="true" /> {item.status === "passed" ? "Unreject" : "Reject"}
                    </Button>
                    <CopyButton text={revertPrompt(item)} label={`Copy revert prompt for version ${item.number}`} announce="Revert prompt copied" size="sm" variant="ghost" icon={<BotIcon aria-hidden="true" />}>Copy revert prompt</CopyButton>
                    {copyableCode(item) && (
                      <CopyButton text={copyableCode(item)} label={`Copy code for version ${item.number}`} announce="Code copied" size="sm" variant="ghost" icon={<CodeIcon aria-hidden="true" />}>Copy code</CopyButton>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
