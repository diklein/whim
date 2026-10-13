import { cookies } from "next/headers";

export type PreviewState = "first-run" | "first-landed" | "first-prompt" | null;

/**
 * Development-only previews, set by /api/preview: "first-run" is a fresh install with nothing captured;
 * "first-landed" is the first prompt arrived with nothing to compare yet; "first-prompt" is the moment after the
 * first prompt with something to show landed. Never active in production.
 */
export async function previewState(): Promise<PreviewState> {
  if (process.env.NODE_ENV === "production") return null;
  const v = (await cookies()).get("whim-preview")?.value;
  return v === "first-run" || v === "first-landed" || v === "first-prompt" ? v : null;
}

export async function isFirstRunPreview() {
  return (await previewState()) === "first-run";
}
