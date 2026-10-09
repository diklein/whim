/**
 * The front-door password. When WHIM_PASSWORD is set, every page asks for it once and keeps a cookie;
 * when it is unset (localhost, by default) there is no gate. The hook's ingest route and the hook download
 * are never gated: they carry their own token. Runs in both the proxy (edge) and server actions (node).
 */
export const GATE_COOKIE = "whim-gate";
export const GATE_MAX_AGE = 60 * 60 * 24 * 30; // a month, then ask again

/** Paths that stay open when the gate is on. */
export function isOpenPath(pathname: string): boolean {
  return pathname === "/gate" || pathname.startsWith("/api/ingest") || pathname.startsWith("/api/setup/hook");
}

/** The cookie value that proves the password was entered: a hash, so the password itself never travels. */
export async function gateCookieValue(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`whim-gate:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Where to send someone after the gate: only a path on this site, never another origin. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/gate")) return "/";
  return next;
}
