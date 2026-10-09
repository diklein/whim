import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getVersionsByIds } from "@/db/queries";
import { nowMs, tokenOrderFor } from "@/lib/format";
import { PageSkeleton } from "@/components/page-skeleton";
import { ComparePanes } from "@/components/compare-panes";
import { EmptyState } from "@/components/empty-state";
import { ColumnsIcon } from "lucide-react";

export const metadata: Metadata = { title: "Compare" };

async function CompareContent({ searchParams }: PageProps<"/compare">) {
  const sp = await searchParams;
  const ids = String(sp.ids ?? "").split(",").map((s) => s.trim()).filter((s) => /^[0-9a-f-]{36}$/.test(s)).slice(0, 3);
  const items = await getVersionsByIds(ids);
  if (items.length < 2) {
    return (
      <main className="flex min-h-dvh flex-col">
        <EmptyState icon={ColumnsIcon} title="Nothing to compare yet">
          Hold two or three versions in a subject with Space, then press C.{" "}
          <Link href="/" className="underline underline-offset-4">Back to Live</Link>
        </EmptyState>
      </main>
    );
  }
  await connection(); // relative times depend on the clock
  return <ComparePanes items={items} tokenOrder={tokenOrderFor(items)} now={nowMs()} />;
}

export default function ComparePage(props: PageProps<"/compare">) {
  return (
    <Suspense fallback={<PageSkeleton kind="compare" />}>
      <CompareContent {...props} />
    </Suspense>
  );
}
