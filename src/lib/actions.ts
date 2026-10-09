"use server";

import { eq, inArray } from "drizzle-orm";
import { updateTag } from "next/cache";
import { WHIM_TAG } from "@/db/queries";
import { db, schema } from "@/db";
import type { VersionStatus } from "@/db/schema";
import { summarizeTurn } from "./summarize";

const { versions, turns, subjects } = schema;

// Single-player app behind one token: there is no per-user auth to check here.

export async function setVersionStatus(id: string, status: VersionStatus) {
  await db
    .update(versions)
    .set({ status, removedAt: status === "removed" ? new Date() : null })
    .where(eq(versions.id, id));
  updateTag(WHIM_TAG);
}

/** Pick one version and pass every other held version in one step (compare). */
export async function pickAmong(pickId: string, otherIds: string[]) {
  await db.update(versions).set({ status: "picked" }).where(eq(versions.id, pickId));
  if (otherIds.length) await db.update(versions).set({ status: "passed" }).where(inArray(versions.id, otherIds));
  updateTag(WHIM_TAG);
}

export async function retrySummary(turnId: string) {
  const result = await summarizeTurn(turnId);
  updateTag(WHIM_TAG);
  return result;
}

export async function renameSubject(id: string, name: string) {
  const clean = name.trim().slice(0, 60);
  if (!clean) return;
  await db.update(subjects).set({ name: clean }).where(eq(subjects.id, id));
  updateTag(WHIM_TAG);
}

export async function setVersionNote(id: string, note: string) {
  await db.update(versions).set({ note: note.trim().slice(0, 500) || null }).where(eq(versions.id, id));
  updateTag(WHIM_TAG);
}

export async function touchTurns() {
  // Used by the poller to confirm the database is reachable.
  await db.select({ id: turns.id }).from(turns).limit(1);
}
