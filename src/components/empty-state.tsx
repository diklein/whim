import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** An icon in a soft circle, a short title, and one line of help. Used wherever a view has nothing to show yet. */
export function EmptyState({ icon: Icon, title, className, children }: { icon: LucideIcon; title: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center", className)} data-whim="whim-empty-state">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground text-pretty">{children}</div>}
    </div>
  );
}
