import { and, desc, eq, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "./index";
import type { SubjectKind } from "./schema";
import type { CaptureStatus, SidebarSubject, TurnGroup, TurnSummary, VersionItem } from "@/lib/types";
import { hasPreview, tokenOrderFor } from "@/lib/format";

const { turns, subjects, versions } = schema;

/** Every read is tagged with this; mutations call updateTag or revalidateTag with it. */
export const WHIM_TAG = "whim";

/** A version worth showing: a screenshot or image, or text on a text or color subject. Mirrors hasPreview in SQL. */
const PREVIEWABLE = or(isNotNull(versions.blobUrl), and(inArray(subjects.kind, ["text", "color"]), isNotNull(versions.textContent)));

/**
 * Capture status from the newest turn: nothing ever captured, a turn still being captured or written up, or idle.
 * The server cannot see the hook, so idle is reported as the time of the last capture, never as "connected".
 */
export function captureStatus(last: { createdAt: Date; status: string } | null): CaptureStatus {
  if (!last) return "none";
  return last.status === "capturing" || last.status === "summarizing" ? "capturing" : "idle";
}

/**
 * The sidebar counts only versions that render, so a subject with nothing to look at never appears
 * and its count matches what its page shows. One round trip: the four queries run together.
 */
export async function getSidebar() {
  "use cache";
  cacheTag(WHIM_TAG);
  cacheLife("hours");
  const [all, shown, lastTurn, passed] = await Promise.all([
    db.select().from(subjects),
    db
      .select({ subjectId: versions.subjectId, turnId: versions.turnId, createdAt: versions.createdAt })
      .from(versions)
      .innerJoin(subjects, eq(subjects.id, versions.subjectId))
      .where(and(ne(versions.status, "removed"), PREVIEWABLE)),
    db.select({ createdAt: turns.createdAt, status: turns.status }).from(turns).orderBy(desc(turns.createdAt)).limit(1),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(versions)
      .innerJoin(subjects, eq(subjects.id, versions.subjectId))
      .where(and(eq(versions.status, "passed"), PREVIEWABLE)),
  ]);
  const stats = new Map<string, { turns: Set<string>; last: Date; first: Date }>();
  for (const v of shown) {
    const st = stats.get(v.subjectId) ?? { turns: new Set(), last: new Date(0), first: v.createdAt };
    st.turns.add(v.turnId);
    if (v.createdAt > st.last) st.last = v.createdAt;
    if (v.createdAt < st.first) st.first = v.createdAt;
    stats.set(v.subjectId, st);
  }
  const byId = new Map<string, SidebarSubject>();
  for (const s of all) {
    const st = stats.get(s.id);
    byId.set(s.id, { id: s.id, slug: s.slug, name: s.name, kind: s.kind, changeCount: st?.turns.size ?? 0, lastChangedAt: st?.last ?? s.lastChangedAt, firstChangedAt: st?.first ?? s.lastChangedAt, children: [] });
  }
  const roots: SidebarSubject[] = [];
  for (const s of all) {
    const node = byId.get(s.id)!;
    const parent = s.parentId ? byId.get(s.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  // Newest first within each section. A parent is as recent as its most recently changed part.
  const byRecency = (a: SidebarSubject, b: SidebarSubject) => b.lastChangedAt.getTime() - a.lastChangedAt.getTime();
  const visible = roots
    .map((r) => {
      const children = r.children.filter((c) => c.changeCount > 0).sort(byRecency);
      const latest = [r.lastChangedAt, ...children.map((c) => c.lastChangedAt)].reduce((m, d) => (d > m ? d : m));
      return { ...r, children, lastChangedAt: latest };
    })
    .filter((r) => r.changeCount > 0 || r.children.length > 0)
    .sort(byRecency);
  return { roots: visible, lastTurn: lastTurn[0] ?? null, passedCount: passed[0]?.n ?? 0 };
}

export const KIND_GROUPS: { label: string; kinds: SubjectKind[] }[] = [
  { label: "Components", kinds: ["component", "pattern"] },
  { label: "Text", kinds: ["text"] },
  { label: "Colors", kinds: ["color"] },
  { label: "Assets", kinds: ["asset"] },
];

async function versionItemsFor(where: ReturnType<typeof and>) {
  const rows = await db
    .select({ v: versions, s: subjects, t: turns })
    .from(versions)
    .innerJoin(subjects, eq(subjects.id, versions.subjectId))
    .innerJoin(turns, eq(turns.id, versions.turnId))
    .where(where)
    .orderBy(versions.createdAt, versions.id);
  return rows;
}

/**
 * Everything one subject has been, grouped by turn, newest first. A parent's view also carries its parts'
 * versions (the copy that lives inside it), so every sidebar item lands on a page with something on it.
 */
export async function getSubjectView(slug: string, opts: { hidePassed?: boolean } = {}) {
  "use cache";
  cacheTag(WHIM_TAG);
  cacheLife("hours");
  // Each query is an HTTP round trip to Neon, so all four key off the slug and run together.
  const bySlug = db.select({ id: subjects.id }).from(subjects).where(eq(subjects.slug, slug));
  const parentOf = db.select({ id: subjects.parentId }).from(subjects).where(eq(subjects.slug, slug));
  const [[subject], [parent = null], children, rows] = await Promise.all([
    db.select().from(subjects).where(eq(subjects.slug, slug)).limit(1),
    db.select().from(subjects).where(inArray(subjects.id, parentOf)).limit(1),
    db.select().from(subjects).where(inArray(subjects.parentId, bySlug)),
    versionItemsFor(or(eq(subjects.slug, slug), inArray(subjects.parentId, bySlug))),
  ]);
  if (!subject) return null;

  // Numbering is per subject and counts every version, removed ones included, so numbers never shift.
  const items: VersionItem[] = [];
  const counters = new Map<string, number>();
  const prevText = new Map<string, string | null>();
  for (const { v, s, t } of rows) {
    const n = (counters.get(s.id) ?? 0) + 1;
    counters.set(s.id, n);
    items.push({
      id: v.id, subjectId: s.id, subjectSlug: s.slug, subjectName: s.name, subjectKind: s.kind,
      turnId: t.id, number: n, blobUrl: v.blobUrl, domSnapshotUrl: v.domSnapshotUrl, width: v.width, height: v.height,
      textContent: v.textContent, codeSnippet: v.codeSnippet, filePath: v.filePath, changeType: v.changeType,
      status: v.status, note: v.note, createdAt: v.createdAt, snapshotSha: t.snapshotSha, prompt: t.prompt,
      summary: t.summary, turnStatus: t.status, previousText: prevText.get(s.id) ?? null,
    });
    if (v.textContent != null) prevText.set(s.id, v.textContent);
  }

  const shown = items.filter((i) => i.status !== "removed" && hasPreview(i));
  const visible = shown.filter((i) => !(opts.hidePassed && i.status === "passed"));
  const groups: TurnGroup[] = [];
  for (const item of visible) {
    let g = groups.find((g) => g.turnId === item.turnId);
    if (!g) {
      g = { turnId: item.turnId, prompt: item.prompt, summary: item.summary, turnStatus: item.turnStatus, createdAt: item.createdAt, items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }
  groups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const counts = {
    total: shown.length,
    passed: shown.filter((i) => i.status === "passed").length,
    picked: shown.filter((i) => i.status === "picked").length,
  };
  const mixed = shown.some((i) => i.subjectId !== subject.id);
  return { subject, parent, children, groups, counts, mixed, tokenOrder: tokenOrderFor(items) };
}

/** Colors from the newest palette version. Unused since the canvas picker left the toolbar; kept for its return. */
export async function getProjectPalette(): Promise<{ name: string; hex: string }[]> {
  const rows = await db
    .select({ text: versions.textContent })
    .from(versions)
    .innerJoin(subjects, eq(subjects.id, versions.subjectId))
    .where(and(eq(subjects.kind, "color"), ne(versions.status, "removed")))
    .orderBy(desc(versions.createdAt))
    .limit(1);
  try {
    const colors = JSON.parse(rows[0]?.text ?? "{}").colors ?? {};
    return Object.entries(colors)
      .filter(([, v]) => typeof v === "string" && /^#[0-9a-f]{3,8}$/i.test(v as string))
      .map(([name, hex]) => ({ name, hex: hex as string }));
  } catch {
    return [];
  }
}

type Row = Awaited<ReturnType<typeof versionItemsFor>>[number];

/** Rows to items with stable version numbers (one query for the subjects' full histories). previousText stays null. */
async function withNumbers(rows: Row[]): Promise<VersionItem[]> {
  const subjectIds = [...new Set(rows.map((r) => r.s.id))];
  const numbers = new Map<string, number>();
  if (subjectIds.length) {
    const all = await db.select({ id: versions.id, subjectId: versions.subjectId }).from(versions).where(inArray(versions.subjectId, subjectIds)).orderBy(versions.createdAt, versions.id);
    const counters = new Map<string, number>();
    for (const v of all) { const n = (counters.get(v.subjectId) ?? 0) + 1; counters.set(v.subjectId, n); numbers.set(v.id, n); }
  }
  return rows.map(({ v, s, t }) => ({
    id: v.id, subjectId: s.id, subjectSlug: s.slug, subjectName: s.name, subjectKind: s.kind, turnId: t.id,
    number: numbers.get(v.id) ?? 1, blobUrl: v.blobUrl, domSnapshotUrl: v.domSnapshotUrl, width: v.width, height: v.height, textContent: v.textContent,
    codeSnippet: v.codeSnippet, filePath: v.filePath, changeType: v.changeType, status: v.status, note: v.note,
    createdAt: v.createdAt, snapshotSha: t.snapshotSha, prompt: t.prompt, summary: t.summary, turnStatus: t.status, previousText: null,
  }));
}

/** The feed: each turn with every version it produced that has something to look at. */
export async function getTurns(limit = 50): Promise<TurnSummary[]> {
  "use cache";
  cacheTag(WHIM_TAG);
  cacheLife("hours");
  const ts = await db.select().from(turns).orderBy(desc(turns.createdAt)).limit(limit);
  if (!ts.length) return [];
  const rows = await versionItemsFor(and(inArray(versions.turnId, ts.map((t) => t.id)), ne(versions.status, "removed")));
  const items = (await withNumbers(rows)).filter(hasPreview);
  return ts.map((t) => {
    const mine = items.filter((i) => i.turnId === t.id);
    return {
      id: t.id, prompt: t.prompt, summary: t.summary, status: t.status, snapshotSha: t.snapshotSha,
      changedPaths: t.changedPaths, captureNote: t.captureNote, createdAt: t.createdAt,
      versions: mine,
      subjects: dedupe(mine.map((i) => ({ slug: i.subjectSlug, name: i.subjectName, kind: i.subjectKind, thumb: i.blobUrl, versionId: i.id }))),
    };
  });
}

function dedupe<T extends { slug: string }>(xs: T[]) {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(x.slug) ? false : (seen.add(x.slug), true)));
}

export async function getTurn(id: string) {
  "use cache";
  cacheTag(WHIM_TAG);
  cacheLife("hours");
  const turn = await db.query.turns.findFirst({ where: eq(turns.id, id) });
  if (!turn) return null;
  const rows = await versionItemsFor(and(eq(versions.turnId, id), ne(versions.status, "removed")));
  const items = (await withNumbers(rows)).filter(hasPreview);
  return { turn, items };
}

export async function getShelved(): Promise<VersionItem[]> {
  "use cache";
  cacheTag(WHIM_TAG);
  cacheLife("hours");
  const rows = await versionItemsFor(eq(versions.status, "passed"));
  return (await withNumbers(rows)).filter(hasPreview).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getVersionsByIds(ids: string[]): Promise<VersionItem[]> {
  "use cache";
  cacheTag(WHIM_TAG);
  cacheLife("hours");
  if (!ids.length) return [];
  // One round trip: every version of the subjects involved, numbered in SQL, so previous text and stable numbers come for free.
  const subjectIds = db.select({ id: versions.subjectId }).from(versions).where(inArray(versions.id, ids));
  const all = await db
    .select({ v: versions, s: subjects, t: turns, n: sql<number>`row_number() over (partition by ${versions.subjectId} order by ${versions.createdAt}, ${versions.id})::int` })
    .from(versions)
    .innerJoin(subjects, eq(subjects.id, versions.subjectId))
    .innerJoin(turns, eq(turns.id, versions.turnId))
    .where(inArray(versions.subjectId, subjectIds))
    .orderBy(versions.createdAt, versions.id);
  const lastText = new Map<string, string | null>();
  const items = new Map<string, VersionItem>();
  for (const { v, s, t, n } of all) {
    if (ids.includes(v.id)) {
      items.set(v.id, {
        id: v.id, subjectId: s.id, subjectSlug: s.slug, subjectName: s.name, subjectKind: s.kind, turnId: t.id,
        number: n, blobUrl: v.blobUrl, domSnapshotUrl: v.domSnapshotUrl, width: v.width, height: v.height, textContent: v.textContent,
        codeSnippet: v.codeSnippet, filePath: v.filePath, changeType: v.changeType, status: v.status, note: v.note,
        createdAt: v.createdAt, snapshotSha: t.snapshotSha, prompt: t.prompt, summary: t.summary, turnStatus: t.status, previousText: lastText.get(s.id) ?? null,
      });
    }
    if (v.textContent != null) lastText.set(s.id, v.textContent);
  }
  // Keep the caller's order.
  return ids.map((id) => items.get(id)).filter((x): x is VersionItem => !!x);
}
