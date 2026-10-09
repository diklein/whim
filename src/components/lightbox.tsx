"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";

/** The hook captures at 2x, so a capture's real on-screen size is half its pixel width. */
const CAPTURE_SCALE = 2;
/** An asset smaller than this (a 24px icon, say) is shown enlarged so it can be judged. */
const MIN_ASSET = 160;

function displayWidth(natural: number, fit: "capture" | "asset") {
  if (fit === "capture") return natural / CAPTURE_SCALE;
  return natural < MIN_ASSET ? MIN_ASSET : natural;
}

type Props = {
  src: string;
  label: string;
  description?: string | null;
  actions?: React.ReactNode;
  fit?: "capture" | "asset";
  /** The element's on-screen size in CSS px, when the capture recorded it. Reserves the box so nothing shifts on load. */
  size?: { width: number; height: number } | null;
  /** In a card: clip the trigger to the card's preview height, centered, so its hit box never extends under the actions. */
  clip?: boolean;
};

/**
 * A capture at natural size in a card; click or Enter opens it full screen at natural size with scrolling.
 * Built on the shadcn Dialog stretched to the viewport. The card's actions ride along in a bar at the bottom,
 * so a version can be picked, rejected, held, removed, or copied without leaving the overlay. Esc closes.
 */
export function Lightbox({ src, label, description, actions, fit = "capture", size, clip = false }: Props) {
  // A recorded size is the on-screen width already. Otherwise, once the image is in, size it from its pixels
  // (crisp on retina, true to life on 1x).
  const [width, setWidth] = useState<number | undefined>(fit === "capture" && size ? size.width : undefined);
  const dims = size ? { width: size.width, height: size.height } : undefined;
  const trigger = useRef<HTMLButtonElement>(null);
  const measure = (img: HTMLImageElement | null) => { if (img?.complete && img.naturalWidth) setWidth(displayWidth(img.naturalWidth, fit)); };
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => measure(e.currentTarget);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button ref={trigger} type="button" aria-label={`View ${label} full screen`} className={`block max-w-full cursor-zoom-in rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${clip ? "grid max-h-[32rem] place-items-center overflow-hidden" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- content-addressed Blob SVG/PNG */}
          <img ref={measure} src={src} alt="" {...dims} loading="lazy" decoding="async" onLoad={onLoad} style={{ width }} className="block h-auto max-w-full" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 ring-0 sm:max-w-none"
        data-whim="whim-lightbox"
        // Focus the scrolling capture, not the first action button, so arrow keys scroll and no tooltip pops on open.
        onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-lightbox-scroll]")?.focus(); }}
        // Back to the card, not the image button inside it, so the grid's keys (arrows, Space, P, X) keep working.
        onCloseAutoFocus={(e) => { const card = trigger.current?.closest<HTMLElement>("[data-version-id]"); if (card) { e.preventDefault(); card.focus(); } }}
      >
        <div className="flex min-h-12 shrink-0 items-center gap-3 border-b px-4 py-2 pr-14">
          <DialogTitle className="shrink-0 text-sm font-medium">{label}</DialogTitle>
          <DialogDescription className={description ? "truncate text-sm text-muted-foreground" : "sr-only"}>
            {description ?? "The capture at full size. Press Escape to close."}
          </DialogDescription>
        </div>
        <div data-lightbox-scroll role="region" tabIndex={0} aria-label="Capture" className="min-h-0 flex-1 overflow-auto overscroll-contain p-6 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
          <div className="grid min-h-full w-fit min-w-full place-items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- natural size, scrollable */}
            <img src={src} alt={`Capture of ${label}`} {...dims} style={{ width: width && fit === "asset" ? Math.max(width, 480) : width }} className="block h-auto max-w-none" />
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-0.5 border-t px-3 py-2 text-foreground [&_button]:size-9 [&_button]:min-h-9 [&_button]:min-w-9 [&_svg]:size-4!">
            {actions}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
