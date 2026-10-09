import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubjectView } from "@/db/queries";
import { KIND_LABEL, pagePath } from "@/lib/format";
import { VersionGrid } from "@/components/version-grid";

export async function generateMetadata({ params }: PageProps<"/subjects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

async function SubjectPageContent({ params, searchParams }: PageProps<"/subjects/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const hidePassed = sp.hide === "passed";
  const view = await getSubjectView(slug, { hidePassed });
  if (!view) notFound();
  const { subject, parent, groups, counts, mixed, tokenOrder } = view;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 pt-5 pb-3 md:px-8">
        {parent && (
          <nav aria-label="Breadcrumb" className="basis-full text-sm text-muted-foreground">
            <Link href={`/subjects/${parent.slug}`} className="hover:text-foreground hover:underline underline-offset-4">{parent.name}</Link>
          </nav>
        )}
        <h1 className="text-lg font-semibold tracking-tight">{subject.name}</h1>
        <p className="text-sm text-muted-foreground">
          {KIND_LABEL[subject.kind]} · <span className="tabular-nums">{counts.total}</span> {counts.total === 1 ? "version" : "versions"}
          {counts.picked > 0 && <> · <span className="tabular-nums">{counts.picked}</span> picked</>}
          {counts.passed > 0 && <> · <span className="tabular-nums">{counts.passed}</span> rejected</>}
        </p>
        <AppearsOn pages={subject.pages.length ? subject.pages : parent?.pages ?? []} />
      </header>
      <VersionGrid
        key={subject.id + String(hidePassed)}
        subjectSlug={subject.slug}
        subjectName={subject.name}
        kind={subject.kind}
        groups={groups}
        tokenOrder={tokenOrder}
        hidePassed={hidePassed}
        passedCount={counts.passed}
        mixed={mixed}
      />
    </div>
  );
}

/** Where the subject was last seen, as links that open the tracked app. Copy nested under a component inherits its pages. */
function AppearsOn({ pages }: { pages: string[] }) {
  if (!pages.length) return null;
  const shown = pages.slice(0, 3);
  const more = pages.length - shown.length;
  return (
    <p className="basis-full text-sm text-muted-foreground" data-whim="whim-appears-on">
      On{" "}
      {shown.map((url, i) => (
        <span key={url}>
          {i > 0 && (i === shown.length - 1 && more === 0 ? " and " : ", ")}
          <a href={url} target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-2 hover:text-foreground">
            {pagePath(url)}
          </a>
        </span>
      ))}
      {more > 0 && <> and {more} more</>}
    </p>
  );
}

export default function SubjectPage(props: PageProps<"/subjects/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton kind="subject" />}>
      <SubjectPageContent {...props} />
    </Suspense>
  );
}
