import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

type Kind = "live" | "subject" | "prompt" | "setup" | "shelved" | "compare";

/**
 * Holds each page's shape while its data streams in. One skeleton per page type, drawn to the same
 * widths and rhythm as the real page, so nothing jumps when the content lands. No spinners.
 */
export function PageSkeleton({ kind = "subject" }: { kind?: Kind }) {
  return (
    <div aria-busy="true" aria-live="polite" data-whim="whim-page-skeleton" data-kind={kind}>
      <span className="sr-only">Loading</span>
      {kind === "live" && <LiveSkeleton />}
      {kind === "subject" && <SubjectSkeleton />}
      {kind === "prompt" && <PromptSkeleton />}
      {kind === "setup" && <SetupSkeleton />}
      {kind === "shelved" && <ShelvedSkeleton />}
      {kind === "compare" && <CompareSkeleton />}
    </div>
  );
}

const Line = ({ className }: { className?: string }) => <Skeleton className={cn("h-3 rounded motion-reduce:animate-none", className)} />;

/** A card at rest: preview box, name row, description line, action row. */
function CardSkeleton({ preview = "h-40" }: { preview?: string }) {
  return (
    <div className="version-card flex flex-col overflow-hidden rounded-lg bg-card">
      <div className={cn("grid place-items-center p-3", preview)}>
        <Skeleton className="h-3/4 w-2/3 rounded-md motion-reduce:animate-none" />
      </div>
      <div className="flex flex-col gap-2 border-t px-3 py-3">
        <div className="flex items-center justify-between">
          <Line className="w-20" />
          <Line className="w-12" />
        </div>
        <Line className="w-4/5" />
        <div className="mt-1 flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="size-6 rounded-md motion-reduce:animate-none" />)}
        </div>
      </div>
    </div>
  );
}

function LiveSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-5 md:px-8">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <Line className="w-28" />
          <CardSkeleton preview="h-56" />
        </div>
      ))}
    </div>
  );
}

function SubjectSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-3 px-5 pt-5 pb-3 md:px-8">
        <Skeleton className="h-6 w-40 rounded motion-reduce:animate-none" />
        <Line className="w-32" />
      </div>
      <div className="px-5 pt-4 md:px-8">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(256px,1fr))]">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

function PromptSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-6 md:px-8">
      <div className="flex flex-col gap-3">
        <Line className="w-24" />
        <Skeleton className="h-7 w-2/3 rounded motion-reduce:animate-none" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32 rounded motion-reduce:animate-none" />
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(256px,1fr))]">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-16 rounded motion-reduce:animate-none" />
        <div className="grid gap-2 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Line key={i} className="w-3/4" />)}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-12 rounded motion-reduce:animate-none" />
        <Skeleton className="h-64 rounded-lg motion-reduce:animate-none" />
      </div>
    </div>
  );
}

function SetupSkeleton() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-5 md:px-8">
      <Skeleton className="h-8 w-24 rounded motion-reduce:animate-none" />
      {[0, 1].map((i) => (
        <div key={i} className={cn("flex flex-col gap-3", i > 0 && "border-t pt-8")}>
          <Line className="w-12" />
          <Skeleton className="h-5 w-72 rounded motion-reduce:animate-none" />
          <Line className="w-full" />
          <Line className="w-5/6" />
          <Skeleton className={cn("rounded-lg motion-reduce:animate-none", i === 0 ? "h-80" : "h-9 w-full")} />
        </div>
      ))}
    </div>
  );
}

function ShelvedSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5 py-5 md:px-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-24 rounded motion-reduce:animate-none" />
        <Line className="w-72" />
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(256px,1fr))]">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}

function CompareSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center gap-4 border-b px-5 py-3 md:px-8">
        <Skeleton className="h-6 w-48 rounded motion-reduce:animate-none" />
        <Skeleton className="ml-auto h-7 w-20 rounded-md motion-reduce:animate-none" />
      </div>
      <div className="grid flex-1 gap-4 px-5 pt-4 md:grid-cols-2 md:px-8">
        {[0, 1].map((i) => <CardSkeleton key={i} preview="h-[min(60vh,560px)]" />)}
      </div>
    </div>
  );
}
