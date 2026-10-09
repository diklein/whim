import type { VersionItem } from "@/lib/types";
import { Preview, PreviewBox } from "./previews";
import { cn } from "@/lib/utils";

/**
 * A read-only version card for the Live feed, the turn view, and Shelved: the preview at natural size, centered
 * and clipped when taller than the box, with a small footer. Cards in one grid share a height.
 */
export function PreviewCard({ item, className, children }: { item: VersionItem; className?: string; children?: React.ReactNode }) {
  return (
    <article className={cn("canvas version-card flex h-full flex-col overflow-hidden rounded-lg bg-card", className)} data-tone="light">
      <PreviewBox kind={item.subjectKind}>
        <Preview item={item} tone="light" />
      </PreviewBox>
      {children && <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs">{children}</div>}
    </article>
  );
}
