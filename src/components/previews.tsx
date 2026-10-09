import { changedShare, parsePalette, wordDiff } from "@/lib/format";
import type { VersionItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Lightbox } from "./lightbox";

/** A lens per kind: image, text ledger with inline diff, or swatch row aligned by token name. */
export function Preview({ item, tokenOrder, tone, size = "card" }: { item: VersionItem; tokenOrder?: string[]; tone: "light" | "dark"; size?: "card" | "large" }) {
  if (item.subjectKind === "color") return <SwatchRow item={item} tokenOrder={tokenOrder ?? []} tone={tone} />;
  if (item.subjectKind === "text") return <TextLedger item={item} tone={tone} size={size} />;
  return <ImagePreview item={item} size={size} />;
}

/**
 * The box around an image preview. It grows with the row, centers what is inside, and clips a screenshot taller
 * than 32rem to its middle, so every card in a grid shares a height. Text and swatch previews size themselves.
 */
export function PreviewBox({ kind, children }: { kind: VersionItem["subjectKind"]; children: React.ReactNode }) {
  if (kind === "text" || kind === "color") return <div data-preview className="min-w-0 flex-1">{children}</div>;
  return <div data-preview className="grid min-h-40 flex-1 place-items-center overflow-hidden p-3 [max-height:32rem]">{children}</div>;
}

export function ImagePreview({ item, size }: { item: VersionItem; size: "card" | "large" }) {
  if (!item.blobUrl) {
    return <div className={cn("grid place-items-center text-xs text-muted-foreground", size === "card" ? "min-h-40" : "min-h-48")}>No preview</div>;
  }
  const fit = item.filePath ? "asset" : "capture";
  if (size === "large") {
    return (
      <div className="grid min-h-48 place-items-center overflow-hidden p-4">
        <Lightbox src={item.blobUrl} label={`${item.subjectName} version ${item.number}`} fit={fit} size={item.width && item.height ? { width: item.width, height: item.height } : null} />
      </div>
    );
  }
  // The screenshot at its natural size, so a 240px sidebar shows at 240px. It only shrinks when wider than the card.
  // PreviewBox centers and clips it. A recorded size reserves the box before load.
  return <Lightbox clip src={item.blobUrl} label={`${item.subjectName} version ${item.number}`} fit={fit} size={item.width && item.height ? { width: item.width, height: item.height } : null} />;
}

export function TextLedger({ item, tone, size }: { item: VersionItem; tone: "light" | "dark"; size: "card" | "large" }) {
  const text = item.textContent ?? "";
  const tokens = item.previousText != null ? wordDiff(item.previousText, text) : [{ type: "same" as const, text }];
  const hasChange = tokens.some((t) => t.type !== "same");
  const rewrite = hasChange && changedShare(tokens) > 0.6;
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <p className={cn("text-pretty leading-snug", size === "card" ? "text-base" : "text-xl", tone === "dark" ? "text-white/90" : "text-foreground")}>
        {hasChange && !rewrite
          ? tokens.map((t, i) =>
              t.type === "same" ? (
                <span key={i}>{t.text}</span>
              ) : t.type === "add" ? (
                <ins key={i} className="rounded-sm bg-picked-soft/90 px-0.5 text-foreground no-underline"><span className="sr-only">added </span>{t.text}</ins>
              ) : (
                <del key={i} className="text-muted-foreground"><span className="sr-only">removed </span>{t.text}</del>
              ),
            )
          : text}
      </p>
      {rewrite && (
        <p className={cn("text-xs text-pretty", tone === "dark" ? "text-white/50" : "text-muted-foreground")}>
          <span className="font-medium">Was</span> <del className="no-underline">{item.previousText}</del>
        </p>
      )}
    </div>
  );
}

export function SwatchRow({ item, tokenOrder, tone }: { item: VersionItem; tokenOrder: string[]; tone: "light" | "dark" }) {
  const { colors } = parsePalette(item.textContent);
  const prev = parsePalette(item.previousText).colors;
  const order = tokenOrder.length ? tokenOrder : Object.keys(colors);
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-2 px-4 py-3" aria-label="Palette tokens">
      {order.map((name) => {
        const hex = colors[name];
        const changed = item.previousText != null && prev[name] !== hex;
        return (
          <li key={name} className="flex w-16 flex-col gap-1">
            <span
              role="img"
              aria-label={hex ? `${name} ${hex}${changed ? ", changed" : ""}` : `${name} not in this version`}
              className={cn("block h-9 rounded-md border", !hex && "border-dashed bg-transparent", changed && "ring-[1.5px] ring-offset-2 ring-foreground/50 ring-offset-card")}
              style={hex ? { background: hex, borderColor: "oklch(0 0 0 / 10%)" } : undefined}
            />
            <span className={cn("truncate text-[11px]", tone === "dark" ? "text-white/70" : "text-muted-foreground")} title={name}>{name}</span>
            <span className={cn("font-mono text-[11px] tabular-nums", tone === "dark" ? "text-white/80" : "text-foreground/80")}>{hex ?? "—"}</span>
          </li>
        );
      })}
    </ul>
  );
}
