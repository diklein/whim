"use client";

import Link from "next/link";
import { BotIcon, CheckIcon, CodeIcon, HandIcon, Trash2Icon, XIcon } from "lucide-react";
import { clockTime, copyableCode, revertPrompt } from "@/lib/format";
import type { VersionItem } from "@/lib/types";
import { Preview, PreviewBox } from "./previews";
import { Lightbox } from "./lightbox";
import { CopyButton } from "./copy-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { RetrySummary } from "./retry-summary";
import { cn } from "@/lib/utils";

type Handlers = { onPick: () => void; onPass: () => void; onRemove: () => void; onHold: () => void };

type Props = Handlers & {
  item: VersionItem;
  layout: "grid" | "ledger" | "rows";
  tokenOrder: string[];
  isActive: boolean;
  isHeld: boolean;
  onFocus: () => void;
  /** Show which subject this is, for grids that mix subjects (the Live feed). */
  showSubject?: boolean;
};

export function VersionCard({ item, layout, tokenOrder, isActive, isHeld, onFocus, showSubject, ...handlers }: Props) {
  // The subject's own note first; the turn summary is the fallback for versions captured before notes existed.
  const description = item.note ?? item.summary;
  const statusLabel = item.status === "passed" ? "rejected" : item.status;
  const title = `${item.subjectName} v${item.number}`;
  const actions = <Actions item={item} isHeld={isHeld} {...handlers} />;
  const overlayActions = <Actions item={item} isHeld={isHeld} {...handlers} overlay />;
  const pending = item.turnStatus === "capturing" || item.turnStatus === "summarizing";
  return (
    <article
      data-version-id={item.id}
      data-status={item.status}
      tabIndex={isActive ? 0 : -1}
      onFocus={onFocus}
      aria-label={`${item.subjectName} version ${item.number}${item.status !== "none" ? `, ${statusLabel}` : ""}`}
      className={cn(
        "version-card group/card relative flex h-full flex-col overflow-hidden rounded-lg bg-card text-card-foreground outline-none transition-[box-shadow,opacity] duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isHeld && "ring-2 ring-primary/70 ring-inset",
      )}
    >
      <div className="relative flex min-w-0 flex-1 flex-col">
        <PreviewBox kind={item.subjectKind}>
          {item.blobUrl ? (
            <Lightbox clip src={item.blobUrl} label={title} description={description} actions={overlayActions} fit={item.filePath ? "asset" : "capture"} size={item.width && item.height ? { width: item.width, height: item.height } : null} />
          ) : (
            <Preview item={item} tokenOrder={tokenOrder} tone="light" />
          )}
        </PreviewBox>
        {item.status !== "none" && layout === "grid" && <StatusBadge status={item.status} className="absolute top-2 left-2 z-10 shadow-[0_1px_2px_oklch(0_0_0/8%)]" />}
        {isHeld && (
          <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]">
            <HandIcon className="size-3" aria-hidden="true" /> Held
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-1.5 border-t px-3 py-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-2">
            {showSubject && (
              <Link href={`/subjects/${item.subjectSlug}`} className="truncate font-medium text-foreground hover:underline underline-offset-4">{item.subjectName}</Link>
            )}
            <span className={cn("tabular-nums", showSubject ? "text-muted-foreground" : "font-medium text-foreground")}>v{item.number}</span>
            {item.status !== "none" && layout !== "grid" && <StatusBadge status={item.status} />}
          </span>
          <Link href={`/turns/${item.turnId}`} className="shrink-0 rounded-sm hover:text-foreground hover:underline underline-offset-4" aria-label={`Open the prompt from ${clockTime(item.createdAt)}`}>
            <time dateTime={item.createdAt.toISOString()} className="tabular-nums">{clockTime(item.createdAt)}</time>
          </Link>
        </div>
        {description ? (
          <p className="line-clamp-3 text-sm text-foreground text-pretty">{description}</p>
        ) : pending ? (
          <p className="text-sm text-muted-foreground"><span className="text-shimmer w-fit">Writing description…</span></p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">No description yet. <RetrySummary turnId={item.turnId} /></p>
        )}
        <div className="quiet-actions -mx-1 mt-auto flex flex-wrap items-center gap-0.5 pt-1">{actions}</div>
      </div>
    </article>
  );
}

/** Every action a version has. Rendered in the card's footer and again in the full-screen overlay, where compare makes no sense. */
function Actions({ item, isHeld, onPick, onPass, onRemove, onHold, overlay = false }: Handlers & { item: VersionItem; isHeld: boolean; overlay?: boolean }) {
  const code = copyableCode(item);
  return (
    <>
      <Action label={item.status === "picked" ? "Unpick" : "Pick"} shortcut="P" onClick={onPick} pressed={item.status === "picked"}>
        <CheckIcon aria-hidden="true" />
      </Action>
      <Action label={item.status === "passed" ? "Unreject" : "Reject"} shortcut="X" onClick={onPass} pressed={item.status === "passed"}>
        <XIcon aria-hidden="true" />
      </Action>
      {!overlay && (
        <Action label={isHeld ? "Remove from compare" : "Add to compare"} shortcut="Space" onClick={onHold} pressed={isHeld}>
          <HandIcon aria-hidden="true" />
        </Action>
      )}
      <Action label="Remove" shortcut="⌫" onClick={onRemove}>
        <Trash2Icon aria-hidden="true" />
      </Action>
      <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <CopyButton text={revertPrompt(item)} label={`Copy revert prompt for version ${item.number}`} announce="Revert prompt copied" size="xs" variant="ghost" icon={<BotIcon aria-hidden="true" />} className="min-h-7 min-w-7 text-inherit hover:text-foreground [&_svg]:size-3.5!" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Copy revert prompt for your agent</TooltipContent>
      </Tooltip>
      {code && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <CopyButton text={code} label={`Copy code for version ${item.number}`} announce="Code copied" size="xs" variant="ghost" icon={<CodeIcon aria-hidden="true" />} className="min-h-7 min-w-7 text-inherit hover:text-foreground [&_svg]:size-3.5!" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Copy code</TooltipContent>
        </Tooltip>
      )}
    </>
  );
}

export function StatusBadge({ status, className }: { status: "picked" | "passed" | "removed"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        status === "picked" && "bg-picked-soft text-picked",
        status === "passed" && "bg-passed-soft text-passed",
        status === "removed" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {status === "picked" && <CheckIcon className="size-3" aria-hidden="true" />}
      {status === "picked" ? "Picked" : status === "passed" ? "Rejected" : "Removed"}
    </span>
  );
}

function Action({ label, shortcut, onClick, pressed, children }: { label: string; shortcut: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={pressed}
          className={cn(
            "grid size-7 place-items-center rounded-md text-inherit transition-colors duration-150 hover:bg-muted hover:text-foreground active:translate-y-px [&_svg]:size-3.5",
            pressed && "text-foreground",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {label} <kbd aria-hidden="true" className="ml-1 font-sans opacity-70">{shortcut}</kbd>
      </TooltipContent>
    </Tooltip>
  );
}
