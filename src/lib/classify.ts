import type { ChangedFile } from "./ingest-schema";
import type { SubjectKind } from "@/db/schema";

const IMAGE = /\.(png|jpe?g|webp|gif|svg)$/i;

/**
 * Deterministic mapping from a changed file to a subject, following the setup conventions:
 *   explorations/<subject>/<variant>   → that subject (asset, or color for palette JSON)
 *   explorations/palette/*.json        → palette (color)
 *   *.md, copy.json                    → text
 * Anything else is recorded on the turn only; the AI layer names subjects for code changes.
 */
export function classifyFile(file: ChangedFile): { slug: string; name: string; kind: SubjectKind } | null {
  const p = file.path.replace(/\\/g, "/");
  const m = p.match(/^(?:.*\/)?explorations\/([^/]+)\/[^/]+$/);
  if (m) {
    const slug = slugify(m[1]);
    if (slug === "palette" || p.endsWith(".json")) return { slug: "palette", name: "Palette", kind: "color" };
    return { slug, name: titleCase(slug), kind: IMAGE.test(p) ? "asset" : "text" };
  }
  if (/(^|\/)copy\.json$/.test(p)) return { slug: "copy", name: "Copy", kind: "text" };
  // Markdown counts as copy only outside docs and repo housekeeping files.
  if (/\.md$/i.test(p) && !/(^|\/)(README|CLAUDE|AGENTS|TASKS|CHANGELOG|LICENSE)\.md$/i.test(p) && !/(^|\/)(docs|\.claude|\.agents|node_modules)\//.test(p)) {
    const base = p.split("/").pop()!.replace(/\.md$/i, "");
    return { slug: slugify(base), name: titleCase(slugify(base)), kind: "text" };
  }
  return null;
}

export const isImage = (path: string) => IMAGE.test(path);

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Display name for a slug, in sentence case. Whim's own `whim-` prefix keeps slugs unique but is not part of the name. */
export function titleCase(slug: string) {
  const words = slug.replace(/^whim-/, "").split("-").filter(Boolean);
  return words.map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
}
