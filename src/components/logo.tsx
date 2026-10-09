import { cn } from "@/lib/utils";

/**
 * The Whim mark: "W." painted in one soft stroke. Heavy where the brush lands, lighter on the upstrokes, rounded
 * terminals, a slight wobble along the edges, and a hand-dabbed period. Draws in currentColor; the sidebar shows
 * it black on a white tile. Chosen from explorations/logo (stack, wave, fan, brush-w).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0.6 1.6 23.2 21.3" className={cn("shrink-0", className)} fill="currentColor">
      <path d="M1.8 6.8C1.1 4.6 3.6 2.6 5.4 3.9C6.3 4.6 6.5 6 6.9 7.3L8.8 13.2C9.3 11.4 9.9 9.6 10.6 8C11.2 6.6 12.8 6.5 13.3 8C14 9.7 14.7 11.5 15.3 13.2L17.1 7.3C17.5 5.6 18.4 3.5 20.3 3.3C22.3 3.1 23.5 5 22.7 6.5C22.2 7.3 21.5 7.6 21.2 8.5L18.1 18.9C17.5 21.2 14.8 21.7 14 19.5L12.2 15L10.4 19.7C9.5 21.8 6.7 21.1 6.3 18.9C5 14.9 3.2 10.8 1.8 6.8Z" />
      <path d="M19.7 20.5C19.5 19 21.3 18.3 22.4 19.2C23.3 19.9 23 21.8 21.6 21.8C20.4 21.9 19.8 21.3 19.7 20.5Z" />
    </svg>
  );
}

export function Logo({ name = "Whim", className }: { name?: string; className?: string }) {
  return (
    <span data-whim="whim-logo" className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-5 text-foreground" />
      <span className="text-[15px] font-semibold tracking-tight">{name}</span>
    </span>
  );
}
