import { notFound } from "next/navigation";
import { PageSkeleton } from "@/components/page-skeleton";

/** Development only: every page's loading state on one page, for design review. */
export default function SkeletonsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const kinds = ["live", "subject", "prompt", "setup", "shelved"] as const;
  return (
    <div className="flex flex-col gap-12 pb-12">
      {kinds.map((k) => (
        <section key={k} aria-label={`${k} loading state`} className="border-b">
          <p className="px-5 pt-5 text-xs font-medium text-muted-foreground uppercase md:px-8">{k}</p>
          <PageSkeleton kind={k} />
        </section>
      ))}
    </div>
  );
}
