import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import Link from "next/link";
import { connection } from "next/server";
import { getShelved } from "@/db/queries";
import { clockTime, relativeTime } from "@/lib/format";
import { PreviewCard } from "@/components/preview-card";
import { EmptyState } from "@/components/empty-state";
import { ArchiveIcon } from "lucide-react";

export const metadata: Metadata = { title: "Shelved" };

/** Every rejected version across subjects: ideas kept for later. */
async function ShelvedPageContent() {
  const items = await getShelved();
  await connection(); // relative times depend on the clock
  return (
    <div className="flex flex-col gap-4 px-5 py-5 md:px-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Shelved</h1>
        <p className="text-sm text-muted-foreground">Rejected versions, across every subject. Nothing here is gone.</p>
      </header>
      {items.length === 0 ? (
        <EmptyState icon={ArchiveIcon} title="Nothing shelved yet.">Press X on a version to reject it. It lands here, not in the trash.</EmptyState>
      ) : (
        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(256px,1fr))]">
          {items.map((v) => (
            <li key={v.id} className="min-w-0">
              <PreviewCard item={v}>
                <Link href={`/subjects/${v.subjectSlug}`} className="truncate font-medium hover:underline underline-offset-4">{v.subjectName}</Link>
                <span className="flex items-center gap-2 text-muted-foreground tabular-nums">
                  <span>v{v.number}</span>
                  <time dateTime={v.createdAt.toISOString()}>{clockTime(v.createdAt)} · {relativeTime(v.createdAt)}</time>
                </span>
              </PreviewCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ShelvedPage() {
  return (
    <Suspense fallback={<PageSkeleton kind="shelved" />}>
      <ShelvedPageContent />
    </Suspense>
  );
}
