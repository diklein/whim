import { z } from "zod";

// What the Stop hook posts. Kept small on purpose: prompt, what changed, and the files worth keeping.
export const changedFileSchema = z.object({
  path: z.string().min(1).max(512),
  status: z.enum(["added", "modified", "deleted"]),
  // Text files arrive as-is; images arrive base64 encoded.
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
  content: z.string().max(4_000_000).optional(),
  mime: z.string().max(100).optional(),
});

export const elementSchema = z.object({
  slug: z.string().min(1).max(80),
  screenshot: z.string().max(6_000_000), // base64 png
  hash: z.string().max(64),
  html: z.string().max(400_000),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Every configured page the element was found on. */
  pages: z.array(z.string().url().max(500)).max(20).default([]),
});

export const fontSchema = z.object({
  hash: z.string().max(64),
  family: z.string().max(120),
  mime: z.string().max(80),
  data: z.string().max(4_200_000), // base64
});

export const ingestSchema = z.object({
  prompt: z.string().min(1).max(20_000),
  snapshotSha: z.string().max(64).optional(),
  diff: z.string().max(400_000).optional(),
  changedFiles: z.array(changedFileSchema).max(200).default([]),
  capturedAt: z.string().datetime().optional(),
  elements: z.array(elementSchema).max(60).default([]),
  pageCss: z.string().max(600_000).nullable().optional(),
  fonts: z.array(fontSchema).max(12).default([]),
  /** Earlier prompts still waiting in the hook's retry queue. Shown so a stuck queue is never silent. */
  queued: z.number().int().min(0).optional(),
  roots: z.object({ htmlClass: z.string().max(2000), htmlStyle: z.string().max(2000), bodyClass: z.string().max(2000) }).nullable().optional(),
  captureError: z.string().max(500).nullable().optional(),
});

export type IngestPayload = z.infer<typeof ingestSchema>;
export type ChangedFile = z.infer<typeof changedFileSchema>;
export type CapturedElement = z.infer<typeof elementSchema>;
