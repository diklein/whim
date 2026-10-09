import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, gateCookieValue, isOpenPath } from "@/lib/gate";

/**
 * The password gate. With WHIM_PASSWORD set, a request without the gate cookie is sent to /gate (pages) or
 * refused (API). Without it, every request passes: localhost stays frictionless.
 */
export async function proxy(req: NextRequest) {
  const password = process.env.WHIM_PASSWORD;
  if (!password) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (isOpenPath(pathname)) return NextResponse.next();
  if (req.cookies.get(GATE_COOKIE)?.value === (await gateCookieValue(password))) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "locked" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything but Next's own assets and static files.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|txt|xml)$).*)"],
};
