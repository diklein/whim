import Link from "next/link";

export function Listening({ setupLink = true }: { setupLink?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
      <span className="relative grid size-6 place-items-center" aria-hidden="true">
        <span className="listening absolute size-3 rounded-full bg-live/40" />
        <span className="size-2 rounded-full bg-live" />
      </span>
      <p className="text-sm font-medium">Waiting for your first prompt</p>
      <p className="max-w-xs text-sm text-muted-foreground text-pretty">Ask Claude for a design change in your project. It shows up here when Claude finishes.</p>
      {setupLink && <Link href="/setup" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Check the setup</Link>}
    </div>
  );
}
