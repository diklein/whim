import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** Fonts stored once in Blob, served same-origin so DOM snapshots can use them without CORS. */
export async function GET(_req: Request, ctx: RouteContext<"/api/font/[hash]">) {
  const { hash } = await ctx.params;
  if (!/^[0-9a-f]{64}$/.test(hash)) return new Response("Not found", { status: 404 });
  const font = await db.query.fonts.findFirst({ where: eq(schema.fonts.hash, hash) });
  if (!font) return new Response("Not found", { status: 404 });
  const upstream = await fetch(font.blobUrl);
  if (!upstream.ok) return new Response("Font unavailable", { status: 502 });
  const ext = font.blobUrl.split(".").pop();
  return new Response(upstream.body, {
    headers: {
      "content-type": ext === "woff2" ? "font/woff2" : ext === "woff" ? "font/woff" : ext === "ttf" ? "font/ttf" : "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "access-control-allow-origin": "*",
    },
  });
}
