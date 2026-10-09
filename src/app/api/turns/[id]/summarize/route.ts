import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { analyzeTurn, summarizeTurn } from "@/lib/summarize";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { WHIM_TAG } from "@/db/queries";

// Retry the AI layer for one turn. Used by the hook's backfill and by the UI's retry action.
export async function POST(req: Request, ctx: RouteContext<"/api/turns/[id]/summarize">) {
  const expected = process.env.WHIM_TOKEN ?? "";
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  // Development only: `?dry=1` returns what the model would say without writing anything, for tuning the prompt.
  if (process.env.NODE_ENV !== "production" && new URL(req.url).searchParams.get("dry") === "1") {
    const turn = await db.query.turns.findFirst({ where: eq(schema.turns.id, id) });
    if (!turn) return Response.json({ error: "not found" }, { status: 404 });
    const { output, changedElements } = await analyzeTurn(turn);
    return Response.json({ changedElements, ...output });
  }
  const result = await summarizeTurn(id);
  revalidateTag(WHIM_TAG, { expire: 0 });
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
