import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Serves a version's DOM snapshot from Whim's own origin. Blob sends HTML as an attachment with a
 * locked-down CSP, so iframes cannot show it directly. Content is content-addressed, so it caches forever.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/dom/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const v = await db.query.versions.findFirst({ where: eq(schema.versions.id, id), columns: { domSnapshotUrl: true } });
  if (!v?.domSnapshotUrl) return new Response("No snapshot", { status: 404 });
  const upstream = await fetch(v.domSnapshotUrl);
  if (!upstream.ok) return new Response("Snapshot unavailable", { status: 502 });
  const html = await upstream.text();
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
      // No scripts ever run. Styles are inline, fonts come from Whim, images may come from anywhere.
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; font-src 'self' data:; img-src * data:; frame-ancestors 'self'",
      "x-content-type-options": "nosniff",
    },
  });
}
