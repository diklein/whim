import type { VersionItem } from "./types";

/** The request's clock reading. Server pages call this once, after `connection()`, and pass it down. */
export function nowMs() {
  return Date.now();
}

export function relativeTime(d: Date, now = nowMs()) {
  const s = Math.round((now - d.getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days} d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function clockTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function shortSha(sha: string | null | undefined) {
  return sha ? sha.slice(0, 7) : "unknown";
}

/** The exact prompt to paste back into the agent. Works with any agent and needs no extra setup. */
export function revertPrompt(v: VersionItem) {
  const body = v.codeSnippet ?? v.textContent ?? "";
  const where = v.filePath ? ` It lives in ${v.filePath}.` : "";
  return `Restore ${v.subjectName} to Whim version ${v.number} (snapshot ${shortSha(v.snapshotSha)}).${where} Its code is below. Change only this part.\n\n${body}`.trimEnd();
}

export function copyableCode(v: VersionItem) {
  return v.codeSnippet ?? v.textContent ?? "";
}

export type DiffToken = { type: "same" | "add" | "del"; text: string };

/**
 * Word-level diff for the text ledger. Whitespace rides along with the word before it, so
 * a changed phrase comes out as one deleted run followed by one added run, not alternating words.
 */
export function wordDiff(before: string, after: string): DiffToken[] {
  const split = (s: string) => s.match(/\S+\s*|\s+/g) ?? [];
  const a = split(before), b = split(after);
  const n = a.length, m = b.length;
  if (n * m > 250_000) return [{ type: "same", text: after }];
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i].trim() === b[j].trim() ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  // Collect raw ops, then group each changed stretch as dels followed by adds.
  const ops: DiffToken[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i].trim() === b[j].trim()) { ops.push({ type: "same", text: b[j] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: "del", text: a[i] }); i++; }
    else { ops.push({ type: "add", text: b[j] }); j++; }
  }
  while (i < n) ops.push({ type: "del", text: a[i++] });
  while (j < m) ops.push({ type: "add", text: b[j++] });

  const out: DiffToken[] = [];
  let dels = "", adds = "";
  const flush = () => {
    if (dels) out.push({ type: "del", text: dels.trimEnd() + " " });
    if (adds) out.push({ type: "add", text: adds });
    dels = ""; adds = "";
  };
  for (const op of ops) {
    if (op.type === "same") { flush(); const last = out[out.length - 1]; if (last?.type === "same") last.text += op.text; else out.push({ ...op }); }
    else if (op.type === "del") dels += op.text;
    else adds += op.text;
  }
  flush();
  return out;
}

/** Share of the new text that changed. Past ~60% a diff reads worse than the plain text. */
export function changedShare(tokens: DiffToken[]) {
  const len = (t: DiffToken[]) => t.reduce((n, x) => n + x.text.length, 0);
  const total = len(tokens.filter((t) => t.type !== "del")) || 1;
  return len(tokens.filter((t) => t.type === "add")) / total;
}

export function parsePalette(text: string | null): { name?: string; colors: Record<string, string> } {
  try {
    const p = JSON.parse(text ?? "{}");
    const colors: Record<string, string> = {};
    for (const [k, v] of Object.entries(p.colors ?? {})) if (typeof v === "string") colors[k] = v;
    return { name: p.name, colors };
  } catch {
    return { colors: {} };
  }
}

/** Relative luminance from a hex color, for choosing light or dark card borders on a custom canvas. */
export function isDarkHex(hex: string) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return false;
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.35;
}

/** A version worth a card: a screenshot or image, or text for a text or color subject. Code-only versions stay in the data but never render. */
export function hasPreview(v: Pick<VersionItem, "blobUrl" | "textContent" | "subjectKind">) {
  return v.blobUrl != null || ((v.subjectKind === "text" || v.subjectKind === "color") && v.textContent != null);
}

/** Union of palette token names in first-seen order, so swatch rows align across versions. */
export function tokenOrderFor(items: Pick<VersionItem, "subjectKind" | "textContent">[]) {
  const order: string[] = [];
  for (const it of items) {
    if (it.subjectKind !== "color" || !it.textContent) continue;
    try {
      const colors = JSON.parse(it.textContent).colors ?? {};
      for (const k of Object.keys(colors)) if (!order.includes(k)) order.push(k);
    } catch {}
  }
  return order;
}

export const KIND_LABEL = { component: "Component", pattern: "Pattern", text: "Text", color: "Color", asset: "Asset" } as const;

/** The page part of a captured URL, for "On /setup" lines. The home page reads as "/" on its own. */
export function pagePath(url: string) {
  try {
    const u = new URL(url);
    return (u.pathname.replace(/\/+$/, "") || "/") + u.search;
  } catch {
    return url;
  }
}
