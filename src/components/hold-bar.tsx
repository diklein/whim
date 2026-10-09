"use client";

import type { VersionItem } from "@/lib/types";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";

export function HoldBar({ held, onClear, onCompare, onUnhold }: { held: VersionItem[]; onClear: () => void; onCompare: () => void; onUnhold: (id: string) => void }) {
  if (!held.length) return null;
  return (
    <div role="status" aria-live="polite" className="fade-in fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]" data-whim="whim-hold-bar">
      <div className="flex items-center gap-3 rounded-xl border bg-card/95 py-2 pr-2 pl-3 shadow-[0_1px_2px_oklch(0_0_0/6%),0_8px_24px_oklch(0_0_0/10%)] backdrop-blur">
        <span className="text-sm">
          <span className="font-medium tabular-nums">{held.length}</span> held
        </span>
        <ul className="flex items-center gap-1">
          {held.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onUnhold(v.id)}
                aria-label={`Release ${v.subjectName} v${v.number}`}
                className="rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                v{v.number}
              </button>
            </li>
          ))}
        </ul>
        <Button size="sm" onClick={onCompare} disabled={held.length < 2}>
          Compare <Kbd aria-hidden="true" className="ml-1 bg-primary-foreground/20 text-primary-foreground">C</Kbd>
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
