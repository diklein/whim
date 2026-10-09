"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setVersionStatus } from "@/lib/actions";
import type { TurnGroup, VersionItem } from "@/lib/types";
import type { SubjectKind, VersionStatus } from "@/db/schema";
import { VersionCard } from "./version-card";
import { HoldBar } from "./hold-bar";
import { Button } from "./ui/button";
import { TooltipProvider } from "./ui/tooltip";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { Poller } from "./poller";
import { ImagesIcon, EyeOffIcon } from "lucide-react";

type Props = {
  /** The subject whose versions these are. Omitted for grids that mix subjects, like one turn in the Live feed. */
  subjectSlug?: string;
  subjectName?: string;
  kind: SubjectKind;
  groups: TurnGroup[];
  tokenOrder: string[];
  hidePassed?: boolean;
  passedCount?: number;
  /** Inside another page's flow: no outer padding, no toolbar, and nothing rendered when empty. */
  embedded?: boolean;
  /** One card per row, for a focused column like the Live feed. */
  single?: boolean;
  /** The cards come from more than one subject (a parent with its parts), so each names its subject. */
  mixed?: boolean;
};

/**
 * The grid: one flowing grid of cards, newest first, like a photo-culling grid. Each card carries its turn's summary.
 * Keyboard model from photo culling: arrows move, Enter opens, P picks, X rejects, ⌫ removes, Space holds, C compares,
 * Esc clears the held set.
 * Single-letter keys only fire with focus inside the grid and never in a text field.
 */
export function VersionGrid({ subjectSlug, subjectName, kind, groups, tokenOrder, hidePassed = false, passedCount = 0, embedded = false, single = false, mixed = false }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [statusById, setStatusById] = useState<Record<string, VersionStatus>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [held, setHeld] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const layout = kind === "text" ? "ledger" : kind === "color" ? "rows" : "grid";

  const flat = groups
    .flatMap((g) => g.items)
    .filter((i) => !removed.has(i.id))
    .map((i) => ({ ...i, status: statusById[i.id] ?? i.status }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const active = flat.find((i) => i.id === activeId) ?? flat[0] ?? null;

  const focusCard = (id: string) => {
    setActiveId(id);
    requestAnimationFrame(() => {
      const el = gridRef.current?.querySelector<HTMLElement>(`[data-version-id="${id}"]`);
      el?.focus({ preventScroll: false });
      el?.scrollIntoView({ block: "nearest" });
    });
  };

  const persist = (id: string, status: VersionStatus, prev: VersionStatus, label?: string) => {
    startTransition(async () => {
      try {
        await setVersionStatus(id, status);
        if (label) toast.success(label);
      } catch {
        setStatusById((s) => ({ ...s, [id]: prev }));
        toast.error("Could not save. Whim is still showing the last saved state.");
      }
    });
  };

  const toggle = (item: VersionItem, status: Extract<VersionStatus, "picked" | "passed">) => {
    const next: VersionStatus = item.status === status ? "none" : status;
    setStatusById((s) => ({ ...s, [item.id]: next }));
    persist(item.id, next, item.status);
  };

  const remove = (item: VersionItem) => {
    const idx = flat.findIndex((i) => i.id === item.id);
    const neighbour = flat[idx + 1] ?? flat[idx - 1];
    setRemoved((r) => new Set(r).add(item.id));
    setHeld((h) => h.filter((x) => x !== item.id));
    if (neighbour) focusCard(neighbour.id);
    startTransition(async () => {
      try {
        await setVersionStatus(item.id, "removed");
      } catch {
        setRemoved((r) => { const n = new Set(r); n.delete(item.id); return n; });
        toast.error("Could not remove. The version is still here.");
        return;
      }
      toast(`Removed ${item.subjectName} v${item.number}`, {
        description: "Kept in the trash for 30 days.",
        action: {
          label: "Undo",
          onClick: () => {
            setRemoved((r) => { const n = new Set(r); n.delete(item.id); return n; });
            startTransition(() => setVersionStatus(item.id, item.status));
            requestAnimationFrame(() => focusCard(item.id));
          },
        },
      });
    });
  };

  const toggleHold = (id: string) => {
    setHeld((h) => (h.includes(id) ? h.filter((x) => x !== id) : h.length >= 3 ? [...h.slice(1), id] : [...h, id]));
  };

  const compare = () => {
    if (compareHref) router.push(compareHref);
    else toast("Add two or three versions to compare first", { description: "Press Space on a card, or use Add to compare." });
  };

  // Arrow navigation uses the rendered geometry, so it works for the grid, the ledger, and swatch rows alike.
  const move = (dir: "left" | "right" | "up" | "down" | "home" | "end") => {
    if (!active || !gridRef.current) return;
    const cards = [...gridRef.current.querySelectorAll<HTMLElement>("[data-version-id]")];
    const i = cards.findIndex((c) => c.dataset.versionId === active.id);
    if (i < 0) return;
    let target: HTMLElement | undefined;
    if (dir === "home") target = cards[0];
    else if (dir === "end") target = cards[cards.length - 1];
    else if (dir === "left") target = cards[i - 1];
    else if (dir === "right") target = cards[i + 1];
    else {
      const cur = cards[i].getBoundingClientRect();
      const candidates = cards.filter((c) => {
        const r = c.getBoundingClientRect();
        return dir === "down" ? r.top > cur.bottom - 1 : r.bottom < cur.top + 1;
      });
      const rowEdge = dir === "down" ? Math.min(...candidates.map((c) => c.getBoundingClientRect().top)) : Math.max(...candidates.map((c) => c.getBoundingClientRect().bottom));
      const row = candidates.filter((c) => { const r = c.getBoundingClientRect(); return dir === "down" ? r.top === rowEdge : r.bottom === rowEdge; });
      target = row.sort((a, b) => Math.abs(a.getBoundingClientRect().left - cur.left) - Math.abs(b.getBoundingClientRect().left - cur.left))[0];
    }
    if (target?.dataset.versionId) focusCard(target.dataset.versionId);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea, select, [contenteditable=true]")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if ((k === " " || k === "Enter") && t.closest("button, a")) return;
    // The full-screen overlay is a portal, so its keys bubble here through React. Esc closes it (not the page);
    // arrows scroll it. Only the judging keys pass through, and they act on the card that opened it.
    if (t.closest('[data-whim="whim-lightbox"]') && !["p", "x", "backspace", "delete"].includes(k.toLowerCase())) return;
    const nav: Record<string, Parameters<typeof move>[0]> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", Home: "home", End: "end" };
    if (nav[k]) { e.preventDefault(); move(nav[k]); return; }
    if (!active) return;
    // Enter on the card itself opens its capture full screen, the same as clicking the image.
    if (k === "Enter" && t.hasAttribute("data-version-id")) {
      e.preventDefault();
      t.querySelector<HTMLElement>('button[aria-label^="View "]')?.click();
      return;
    }
    switch (k.toLowerCase()) {
      case "p": e.preventDefault(); toggle(active, "picked"); break;
      case "x": e.preventDefault(); toggle(active, "passed"); break;
      case "backspace": case "delete": e.preventDefault(); remove(active); break;
      case " ": e.preventDefault(); toggleHold(active.id); break;
      case "c": e.preventDefault(); compare(); break;
      case "escape": if (held.length) { e.preventDefault(); setHeld([]); } break;
    }
  };

  // Compare is a separate route; warm it as soon as two versions are held so entering it is instant.
  const compareHref = held.length >= 2 ? `/compare?ids=${held.join(",")}` : null;
  useEffect(() => { if (compareHref) router.prefetch(compareHref); }, [compareHref, router]);

  // With nothing focused on the page, an arrow key pulls focus into the grid instead of doing nothing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      if (document.activeElement && document.activeElement !== document.body) return;
      if (!active) return;
      e.preventDefault();
      focusCard(active.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!flat.length) {
    if (embedded) return null;
    return (
      <EmptyState icon={hidePassed && passedCount ? EyeOffIcon : ImagesIcon} title={hidePassed && passedCount ? "Every version here is rejected." : "No versions yet."}>
        {hidePassed && passedCount ? (
          <Link href={`/subjects/${subjectSlug}`} className="underline underline-offset-4">Show rejected versions</Link>
        ) : (
          `The next prompt that changes ${subjectName} will show up here.`
        )}
      </EmptyState>
    );
  }

  const pending = flat.some((i) => i.turnStatus === "capturing" || i.turnStatus === "summarizing");
  return (
    <TooltipProvider delayDuration={300}>
      {pending && !embedded && <Poller every={3000} />}
      {subjectSlug && passedCount > 0 && (
        <div className="flex items-center justify-end px-5 pb-2 md:px-8" data-whim="whim-grid-toolbar">
          <Button asChild variant="ghost" size="sm">
            <Link href={hidePassed ? `/subjects/${subjectSlug}` : `/subjects/${subjectSlug}?hide=passed`} scroll={false}>
              {hidePassed ? "Show rejected" : "Hide rejected"}
            </Link>
          </Button>
        </div>
      )}

      <div
        ref={gridRef}
        role={embedded ? undefined : "region"}
        aria-label={embedded ? undefined : subjectName ? `${subjectName} versions` : "Versions from this prompt"}
        data-whim={embedded ? undefined : "whim-grid"}
        className={cn("canvas", embedded ? "pt-1" : "flex-1 px-5 pt-2 pb-28 md:px-8")}
        data-tone="light"
        onKeyDown={onKeyDown}
      >
        <ul
          className={cn(
            "list-none p-0",
            layout === "grid" && (single ? "grid grid-cols-1 gap-3" : "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(256px,1fr))]"),
            layout === "ledger" && "mx-auto flex w-full max-w-3xl flex-col gap-3",
            layout === "rows" && "mx-auto flex w-full max-w-4xl flex-col gap-3",
          )}
        >
          {flat.map((item) => (
            <li key={item.id} className="min-w-0">
              <VersionCard
                item={item}
                layout={layout}
                tokenOrder={tokenOrder}
                isActive={active?.id === item.id}
                isHeld={held.includes(item.id)}
                showSubject={!subjectSlug || mixed}
                onFocus={() => setActiveId(item.id)}
                onPick={() => toggle(item, "picked")}
                onPass={() => toggle(item, "passed")}
                onRemove={() => remove(item)}
                onHold={() => toggleHold(item.id)}
              />
            </li>
          ))}
        </ul>
      </div>

      <HoldBar held={held.map((id) => flat.find((i) => i.id === id)).filter((x): x is VersionItem => !!x)} onClear={() => setHeld([])} onCompare={compare} onUnhold={toggleHold} />
    </TooltipProvider>
  );
}
