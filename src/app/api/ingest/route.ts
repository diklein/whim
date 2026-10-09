import { createHash, timingSafeEqual } from "node:crypto";
import { put } from "@vercel/blob";
import { after } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { classifyFile, isImage, titleCase } from "@/lib/classify";
import { revalidateTag } from "next/cache";
import { WHIM_TAG } from "@/db/queries";
import { ingestSchema } from "@/lib/ingest-schema";
import { summarizeTurn } from "@/lib/summarize";

export const maxDuration = 60;

const { turns, subjects, versions, fonts } = schema;

function authorized(req: Request) {
  const expected = process.env.WHIM_TOKEN;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !got || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = ingestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid payload", issues: parsed.error.issues }, { status: 400 });
  }
  const payload = parsed.data;

  // 1. The turn lands immediately with its prompt and diff, whatever happens next.
  const [turn] = await db
    .insert(turns)
    .values({
      prompt: payload.prompt,
      snapshotSha: payload.snapshotSha,
      diff: payload.diff,
      changedPaths: payload.changedFiles.map((f) => f.path),
      status: "capturing",
      createdAt: payload.capturedAt ? new Date(payload.capturedAt) : undefined,
    })
    .returning();

  // 2. Files that follow the conventions become versions of a subject right away.
  let created = 0;
  for (const file of payload.changedFiles) {
    if (file.status === "deleted" || file.content == null) continue;
    const target = classifyFile(file);
    if (!target) continue;

    const [subject] = await db
      .insert(subjects)
      .values({ slug: target.slug, name: target.name, kind: target.kind })
      .onConflictDoUpdate({
        target: subjects.slug,
        set: { lastChangedAt: turn.createdAt, changeCount: sql`${subjects.changeCount} + 1` },
      })
      .returning();

    const buf = Buffer.from(file.content, file.encoding === "base64" ? "base64" : "utf8");
    const hash = createHash("sha256").update(buf).digest("hex");
    let blobUrl: string | null = null;
    if (isImage(file.path)) {
      const ext = file.path.split(".").pop()!.toLowerCase();
      const { url } = await put(`files/${hash}.${ext}`, buf, {
        access: "public",
        contentType: file.mime ?? (ext === "svg" ? "image/svg+xml" : `image/${ext}`),
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      blobUrl = url;
    }
    await db.insert(versions).values({
      subjectId: subject.id,
      turnId: turn.id,
      blobUrl,
      imageHash: blobUrl ? hash : null,
      textContent: blobUrl ? null : buf.toString("utf8").slice(0, 20_000),
      codeSnippet: ext(file.path) === "svg" ? buf.toString("utf8").slice(0, 20_000) : null,
      filePath: file.path,
      changeType: target.kind === "color" ? "color" : target.kind === "text" ? "copy" : "asset",
      createdAt: turn.createdAt,
    });
    created++;
  }

  // 2a. Fonts are stored once by content hash and shared by every snapshot.
  let pageCss = payload.pageCss ?? "";
  for (const f of payload.fonts) {
    const existing = await db.query.fonts.findFirst({ where: eq(fonts.hash, f.hash) });
    if (!existing) {
      const ext = f.mime.includes("woff2") ? "woff2" : f.mime.includes("woff") ? "woff" : f.mime.includes("ttf") || f.mime.includes("truetype") ? "ttf" : "bin";
      const { url } = await put(`fonts/${f.hash}.${ext}`, Buffer.from(f.data, "base64"), {
        access: "public", contentType: f.mime, addRandomSuffix: false, allowOverwrite: true,
      });
      await db.insert(fonts).values({ hash: f.hash, blobUrl: url, family: f.family }).onConflictDoNothing();
    }
    pageCss = pageCss.replaceAll(`whim-font:${f.hash}`, `/api/font/${f.hash}`);
  }

  // 2b. Elements from the running page: one version per [data-whim] whose screenshot changed.
  const pageSlugs: string[] = [];
  for (const el of payload.elements) {
    pageSlugs.push(el.slug);
    const [subject] = await db
      .insert(subjects)
      .values({ slug: el.slug, name: titleCase(el.slug), kind: "component", pages: el.pages })
      .onConflictDoUpdate({ target: subjects.slug, set: { pages: el.pages } })
      .returning();
    const [latest] = await db
      .select({ imageHash: versions.imageHash })
      .from(versions)
      .where(and(eq(versions.subjectId, subject.id), eq(versions.status, "none")))
      .orderBy(desc(versions.createdAt))
      .limit(1);
    const unchanged = await db
      .select({ id: versions.id })
      .from(versions)
      .where(and(eq(versions.subjectId, subject.id), eq(versions.imageHash, el.hash)))
      .limit(1);
    if (unchanged.length || latest?.imageHash === el.hash) continue;

    const png = Buffer.from(el.screenshot, "base64");
    const [shot, dom] = await Promise.all([
      put(`files/${el.hash}.png`, png, { access: "public", contentType: "image/png", addRandomSuffix: false, allowOverwrite: true }),
      put(`dom/${el.hash}.html`, domSnapshotDocument(el.html, pageCss, el.width, payload.roots ?? undefined), {
        access: "public", contentType: "text/html; charset=utf-8", addRandomSuffix: false, allowOverwrite: true,
      }),
    ]);
    await db.insert(versions).values({
      subjectId: subject.id,
      turnId: turn.id,
      blobUrl: shot.url,
      domSnapshotUrl: dom.url,
      imageHash: el.hash,
      width: el.width,
      height: el.height,
      codeSnippet: el.html.slice(0, 20_000),
      changeType: "layout",
      createdAt: turn.createdAt,
    });
    await db
      .update(subjects)
      .set({ lastChangedAt: turn.createdAt, changeCount: sql`${subjects.changeCount} + 1` })
      .where(eq(subjects.id, subject.id));
    created++;
  }
  const notes = [payload.captureError, payload.queued ? `${payload.queued} earlier ${payload.queued === 1 ? "prompt is" : "prompts are"} still waiting to upload` : null].filter(Boolean);
  if (notes.length) {
    await db.update(turns).set({ captureNote: notes.join("; ") }).where(eq(turns.id, turn.id));
  }

  // 3. Respond now so the hook is never slow; the AI layer runs after the response is sent.
  await db.update(turns).set({ status: "summarizing" }).where(eq(turns.id, turn.id));
  revalidateTag(WHIM_TAG, { expire: 0 });
  after(async () => {
    await summarizeTurn(turn.id, { pageSlugs });
    revalidateTag(WHIM_TAG, { expire: 0 });
  });

  return Response.json({ turnId: turn.id, versions: created }, { status: 201 });
}

const ext = (p: string) => p.split(".").pop()?.toLowerCase() ?? "";

/** A standalone document for live markup: the element's HTML plus the page CSS. No scripts run. */
function domSnapshotDocument(html: string, css: string, width: number, roots?: { htmlClass: string; htmlStyle: string; bodyClass: string }) {
  const attr = (v: string) => v.replace(/"/g, "&quot;");
  const htmlAttrs = roots ? ` class="${attr(roots.htmlClass)}"${roots.htmlStyle ? ` style="${attr(roots.htmlStyle)}"` : ""}` : "";
  const bodyAttrs = roots?.bodyClass ? ` class="${attr(roots.bodyClass)}"` : "";
  return `<!doctype html><html${htmlAttrs}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css}</style><style>html,body{margin:0;min-height:0}body{display:inline-block;min-width:${width}px}</style></head><body${bodyAttrs}>${html}</body></html>`;
}
