import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Turns are the "when": one Claude Code turn, one row.
export const turnStatus = pgEnum("turn_status", [
  "capturing",
  "summarizing",
  "ready",
  "failed",
]);

export const turns = pgTable(
  "turns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prompt: text("prompt").notNull(),
    summary: text("summary"),
    snapshotSha: text("snapshot_sha"),
    status: turnStatus("status").notNull().default("capturing"),
    // Kept on the turn so the AI layer can retry and the turn view can show the change.
    diff: text("diff"),
    changedPaths: jsonb("changed_paths").$type<string[]>().notNull().default([]),
    // Why element capture did not happen this turn, if it did not (for example localhost unreachable).
    captureNote: text("capture_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("turns_created_at_idx").on(t.createdAt)],
);

// Subjects are the "what": the component, text, color, or asset that changed.
export const subjectKind = pgEnum("subject_kind", [
  "component",
  "pattern",
  "text",
  "color",
  "asset",
]);

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    kind: subjectKind("kind").notNull(),
    parentId: uuid("parent_id"),
    lastChangedAt: timestamp("last_changed_at", { withTimezone: true }).notNull().defaultNow(),
    changeCount: integer("change_count").notNull().default(0),
    // Pages the subject was last seen on, from the capture hook. Empty for file-based subjects.
    pages: text("pages").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [index("subjects_kind_idx").on(t.kind), index("subjects_parent_idx").on(t.parentId)],
);

// Versions join a subject to a turn. Siblings from one turn form an exploration set.
export const versionStatus = pgEnum("version_status", ["none", "picked", "passed", "removed"]);

export const changeType = pgEnum("change_type", ["copy", "color", "layout", "feature", "asset"]);

export const versions = pgTable(
  "versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    turnId: uuid("turn_id")
      .notNull()
      .references(() => turns.id, { onDelete: "cascade" }),
    // Screenshot or image file.
    blobUrl: text("blob_url"),
    // Saved HTML and CSS for live markup.
    domSnapshotUrl: text("dom_snapshot_url"),
    // For text subjects: the copy itself. For colors: palette JSON as text.
    textContent: text("text_content"),
    codeSnippet: text("code_snippet"),
    filePath: text("file_path"),
    imageHash: text("image_hash"),
    // On-screen size of a captured element in CSS px, so a card can reserve its box before the image loads.
    width: integer("width"),
    height: integer("height"),
    changeType: changeType("change_type"),
    status: versionStatus("status").notNull().default("none"),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("versions_subject_idx").on(t.subjectId, t.createdAt),
    index("versions_turn_idx").on(t.turnId),
    index("versions_status_idx").on(t.status),
  ],
);

// Fonts are stored once by content hash and shared by every DOM snapshot.
export const fonts = pgTable("fonts", {
  hash: text("hash").primaryKey(),
  blobUrl: text("blob_url").notNull(),
  family: text("family").notNull(),
});

export type Turn = typeof turns.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Version = typeof versions.$inferSelect;
export type Font = typeof fonts.$inferSelect;
export type SubjectKind = (typeof subjectKind.enumValues)[number];
export type VersionStatus = (typeof versionStatus.enumValues)[number];
export type TurnStatus = (typeof turnStatus.enumValues)[number];
export type ChangeType = (typeof changeType.enumValues)[number];
