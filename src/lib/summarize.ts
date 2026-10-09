import { generateText, Output } from "ai";
import { and, eq, inArray, isNotNull, isNull, ne, notInArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { turnAnalysisSchema, type TurnAnalysis } from "./ai-schema";
import { slugify } from "./classify";

const { turns, subjects, versions } = schema;

export const SUMMARY_MODEL = process.env.WHIM_MODEL ?? "anthropic/claude-sonnet-5.5";
// Tried in order when the primary is unavailable (for example on a gateway free tier).
export const FALLBACK_MODELS = (process.env.WHIM_FALLBACK_MODELS ?? "openai/gpt-5.2,google/gemini-2.5-flash")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_DIFF_CHARS = 14_000;

/**
 * The AI layer: one structured call that writes the turn summary and names the subjects it touched.
 * Deterministic capture already happened; this only labels. Every label stays editable.
 */
export async function summarizeTurn(turnId: string, opts: { pageSlugs?: string[] } = {}): Promise<{ ok: boolean; error?: string }> {
  const turn = await db.query.turns.findFirst({ where: eq(turns.id, turnId) });
  if (!turn) return { ok: false, error: "turn not found" };

  await db.update(turns).set({ status: "summarizing" }).where(eq(turns.id, turnId));

  try {
    const { output, bySlug, whimSlugs } = await analyzeTurn(turn, opts);
    await applyAnalysis(turn, output, bySlug, new Set(whimSlugs));
    await pruneUnclaimedElements(turn, output, bySlug);
    await db.update(turns).set({ summary: output.summary, status: "ready" }).where(eq(turns.id, turnId));
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[whim] summarize ${turnId} failed:`, error);
    await db.update(turns).set({ status: "failed" }).where(eq(turns.id, turnId));
    return { ok: false, error };
  }
}

/** The model call alone: reads the turn and the subject list, writes nothing. Used by summarizeTurn and by dry runs. */
export async function analyzeTurn(turn: typeof turns.$inferSelect, opts: { pageSlugs?: string[] } = {}) {
  {
    const existing = await db.select().from(subjects);
    const bySlug = new Map(existing.map((s) => [s.slug, s]));
    const byId = new Map(existing.map((s) => [s.id, s]));
    const existingList = existing.map((s) => ({
      slug: s.slug,
      name: s.name,
      kind: s.kind,
      parentSlug: s.parentId ? (byId.get(s.parentId)?.slug ?? null) : null,
    }));
    const whimSlugs = [...new Set([...(opts.pageSlugs ?? []), ...[...(turn.diff ?? "").matchAll(/data-whim=["']([a-z0-9-]+)["']/g)].map((m) => m[1])])];
    // Elements whose screenshot changed this turn. Some changed by design; some only show live data (counts, times).
    const changedElements = (
      await db
        .select({ slug: subjects.slug })
        .from(versions)
        .innerJoin(subjects, eq(subjects.id, versions.subjectId))
        .where(and(eq(versions.turnId, turn.id), isNotNull(versions.imageHash), isNull(versions.filePath)))
    ).map((r) => r.slug);

    const { output } = await generateText({
      model: SUMMARY_MODEL,
      output: Output.object({ schema: turnAnalysisSchema }),
      system: SYSTEM,
      prompt: buildPrompt({ turn, existingList, whimSlugs, changedElements }),
      temperature: 0,
      providerOptions: { gateway: { models: FALLBACK_MODELS } },
    });
    return { output, bySlug, whimSlugs, changedElements };
  }
}

const SYSTEM = `You label design history for Whim. A developer prompted a coding agent; you see the prompt and what changed. Write a one-sentence summary and name the subjects touched.

Rules:
- A subject is a piece of UI (component), a recurring pattern, user-facing copy (text), a palette or color token (color), or an image or icon (asset). Config, tests, build files, and docs are not subjects.
- Reuse an existing subject's slug whenever the change is to the same thing. Never invent a near-duplicate.
- Prefer data-whim slugs found in the code: they are the canonical names.
- Nest at most two levels: parentSlug must be an existing or newly listed top-level subject, or null.
- Keep names short and stable. Do not rename existing subjects.
- codeSnippet must be copied verbatim from the diff's added lines. If the diff does not contain code for the subject, use null. Never invent code.
- Any change to user-facing copy is a text subject: a heading, a label, button text, an empty state, a description, a tooltip. Name it by what it is (for example "Empty state headline"), and always fill textContent with the new copy itself, verbatim from the diff's added lines, without markup. A text subject without textContent is dropped.
- note, per subject: what changed for that subject alone, under 10 words, in the same plain design-only voice as the summary. A turn that recolors the sidebar and rewords a headline gets two different notes.
- Copy belongs to the component it lives in. Set a text subject's parentSlug to the data-whim slug of the element that contains it (the nearest one). Only copy that lives in no tagged element, such as copy.json or a markdown file, stands alone.
- If the diff is empty, say that nothing on disk changed and list no subjects.
- "Elements whose screenshot changed" lists on-screen parts that look different after this turn. Include one as a subject only if this turn's diff changed how it is designed. Leave it out when it only shows live data that moved on its own: a count, a time, a status word, a list that gained a row.
- Summary: one very short sentence, past tense, plain words, under 12 words. Describe only the visible design change: what looks, reads, or is laid out differently. Never mention code, files, functions, APIs, data, or how it was done.
  Behavior is not design. A redirect, a poll, a save, a cache, a validation rule, or a key binding does not count. Accessibility plumbing is not design either: aria attributes, roles, labels, screen-reader-only text, focus handling, and landmarks change nothing anyone can see. If the turn changed only behavior, accessibility plumbing, or code, the summary is exactly "No visible design change."
  Claim a subject only for a change someone would notice in a screenshot. When in doubt, leave it out: a missing card is a small loss, a card described with a change it does not show is a lie.
  Small is still design. A button variant, a color, a size, spacing, a border, a shadow, an icon, or a font weight changing is a visible design change and gets a summary and a subject.
  Good: "Sidebar sections now collapse, with icons on each subject." Bad: "Refactored the sidebar component to use Radix Collapsible with localStorage state." Bad: "Live now redirects to Setup until the first turn appears."`;

function buildPrompt(args: {
  turn: typeof turns.$inferSelect;
  existingList: { slug: string; name: string; kind: string; parentSlug: string | null }[];
  whimSlugs: string[];
  changedElements: string[];
}) {
  const { turn, existingList, whimSlugs, changedElements } = args;
  const diff = (turn.diff ?? "").slice(0, MAX_DIFF_CHARS);
  return [
    `## Prompt\n${turn.prompt}`,
    `## Changed files\n${turn.changedPaths.length ? turn.changedPaths.map((p) => `- ${p}`).join("\n") : "(none recorded)"}`,
    `## data-whim slugs in the change\n${whimSlugs.length ? whimSlugs.join(", ") : "(none)"}`,
    `## Elements whose screenshot changed\n${changedElements.length ? changedElements.join(", ") : "(none)"}`,
    `## Existing subjects\n${existingList.length ? existingList.map((s) => `- ${s.slug} (${s.kind}) "${s.name}"${s.parentSlug ? ` under ${s.parentSlug}` : ""}`).join("\n") : "(none yet)"}`,
    `## Diff${diff.length < (turn.diff ?? "").length ? " (truncated)" : ""}\n\`\`\`diff\n${diff || "(empty)"}\n\`\`\``,
  ].join("\n\n");
}

async function applyAnalysis(
  turn: typeof turns.$inferSelect,
  out: TurnAnalysis,
  bySlug: Map<string, typeof subjects.$inferSelect>,
  whimSlugs: Set<string>,
) {
  // Parents first so children can reference them.
  const ordered = [...out.subjects].sort((a, b) => Number(!!a.parentSlug) - Number(!!b.parentSlug));
  const touched: string[] = [];

  for (const s of ordered) {
    const slug = slugify(s.slug);
    if (!slug) continue;
    let row = bySlug.get(slug);
    const parentSlug = s.parentSlug ? slugify(s.parentSlug) : null;
    const parent = parentSlug && parentSlug !== slug ? bySlug.get(parentSlug) : undefined;
    // Two levels max: a parent must itself be top-level.
    const parentId = parent && !parent.parentId ? parent.id : null;

    if (!row) {
      // Capture is deterministic; AI sits on top. A brand-new component or pattern needs a data-whim
      // slug behind it, or it is just a code file the model noticed. Text, color, and asset subjects
      // arrive through the explorations conventions, so they are allowed.
      if ((s.kind === "component" || s.kind === "pattern") && !whimSlugs.has(slug)) continue;
      [row] = await db
        .insert(subjects)
        .values({ slug, name: s.name.trim() || slug, kind: s.kind, parentId, lastChangedAt: turn.createdAt, changeCount: 0 })
        .onConflictDoNothing()
        .returning();
      if (!row) row = (await db.query.subjects.findFirst({ where: eq(subjects.slug, slug) }))!;
      bySlug.set(slug, row);
    }
    touched.push(row.id);

    // Convention files already created a version for this subject in ingest; don't double up.
    const already = await db.query.versions.findFirst({
      where: and(eq(versions.turnId, turn.id), eq(versions.subjectId, row.id)),
    });
    const text = s.kind === "text" && s.textContent?.trim() ? s.textContent.trim().slice(0, 20_000) : null;
    // A subject's first version is a baseline, not a change: it exists so the next version has something to differ from.
    const earlier = await db.query.versions.findFirst({ where: and(eq(versions.subjectId, row.id), ne(versions.turnId, turn.id)) });
    const note = earlier ? s.note?.trim().slice(0, 500) || null : "First capture.";
    // A text version is its copy; without it there is nothing to show, so it never lands.
    if (s.kind === "text" && !text && !already) continue;
    if (already) {
      const patch: Partial<typeof versions.$inferInsert> = {};
      if (!already.changeType) patch.changeType = s.changeType;
      if (already.textContent == null && text) patch.textContent = text;
      if ((already.note == null || !earlier) && note) patch.note = note;
      if (Object.keys(patch).length) await db.update(versions).set(patch).where(eq(versions.id, already.id));
      continue;
    }
    await db.insert(versions).values({
      subjectId: row.id,
      turnId: turn.id,
      filePath: s.filePath,
      codeSnippet: s.codeSnippet?.slice(0, 8_000) ?? null,
      textContent: text,
      note,
      changeType: s.changeType,
      createdAt: turn.createdAt,
    });
  }

  await recount(touched);
}

/**
 * Capture screenshots every [data-whim] element whose pixels changed, which includes elements that only show
 * live data. The model saw the diff and said which parts were designed differently; the rest of this turn's
 * element versions are capture noise and are dropped, so a card's description always matches its picture.
 */
async function pruneUnclaimedElements(turn: typeof turns.$inferSelect, out: TurnAnalysis, bySlug: Map<string, typeof subjects.$inferSelect>) {
  // The prompt names every element that rendered differently, so a capture the model still left out is one it
  // judged to show only live data (a time, a count, a status word). Keeping it would give the card a description
  // borrowed from the turn, about something else entirely.
  const claimed = out.subjects.map((s) => bySlug.get(slugify(s.slug))?.id).filter((id): id is string => !!id);
  const where = and(eq(versions.turnId, turn.id), isNotNull(versions.imageHash), isNull(versions.filePath), eq(versions.status, "none"), ...(claimed.length ? [notInArray(versions.subjectId, claimed)] : []));
  const dropped = await db.delete(versions).where(where).returning({ subjectId: versions.subjectId });
  if (dropped.length) await recount(dropped.map((d) => d.subjectId));
}

/** Recompute recency and counts from the versions table so they stay honest after retries and pruning. */
async function recount(ids: string[]) {
  for (const id of new Set(ids)) {
    const mine = await db
      .select({ turnId: versions.turnId, createdAt: versions.createdAt })
      .from(versions)
      .where(and(eq(versions.subjectId, id), inArray(versions.status, ["none", "picked", "passed"])));
    const last = mine.reduce((m, v) => (v.createdAt > m ? v.createdAt : m), new Date(0));
    await db.update(subjects).set({ changeCount: new Set(mine.map((v) => v.turnId)).size, lastChangedAt: last }).where(eq(subjects.id, id));
  }
}
