import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Development only. `/api/preview?state=first-run` shows Whim as a fresh install sees it; `?state=first-landed`
 * shows Live after the very first prompt, before there is anything to compare; `?state=first-prompt` shows the
 * moment after the first prompt with something to show landed (only that prompt is visible); `?state=off` returns
 * to the real state. Nothing in the database changes.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const state = new URL(req.url).searchParams.get("state");
  const jar = await cookies();
  if (state === "first-run" || state === "first-landed" || state === "first-prompt") jar.set("whim-preview", state, { path: "/", httpOnly: true, sameSite: "lax" });
  else jar.delete("whim-preview");
  redirect(state === "first-run" ? "/setup" : "/");
}
