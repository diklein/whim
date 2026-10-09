import type { ChangeType, SubjectKind, TurnStatus, VersionStatus } from "@/db/schema";

export type VersionItem = {
  id: string;
  subjectId: string;
  subjectSlug: string;
  subjectName: string;
  subjectKind: SubjectKind;
  turnId: string;
  /** 1-based, stable per subject, counts removed versions too. */
  number: number;
  blobUrl: string | null;
  domSnapshotUrl: string | null;
  /** On-screen size of a captured element in CSS px; null for file assets. */
  width: number | null;
  height: number | null;
  textContent: string | null;
  codeSnippet: string | null;
  filePath: string | null;
  changeType: ChangeType | null;
  status: VersionStatus;
  note: string | null;
  createdAt: Date;
  snapshotSha: string | null;
  prompt: string;
  summary: string | null;
  turnStatus: TurnStatus;
  /** Text of the previous version of the same subject, for the ledger diff. */
  previousText: string | null;
};

export type TurnGroup = {
  turnId: string;
  prompt: string;
  summary: string | null;
  turnStatus: TurnStatus;
  createdAt: Date;
  items: VersionItem[];
};

export type SidebarSubject = {
  id: string;
  slug: string;
  name: string;
  kind: SubjectKind;
  changeCount: number;
  lastChangedAt: Date;
  /** When this subject first got a version that renders. Used by the first-prompt preview. */
  firstChangedAt: Date;
  children: SidebarSubject[];
};

export type CaptureStatus = "capturing" | "idle" | "none";

export type TurnSummary = {
  id: string;
  prompt: string;
  summary: string | null;
  status: TurnStatus;
  snapshotSha: string | null;
  changedPaths: string[];
  captureNote: string | null;
  createdAt: Date;
  subjects: { slug: string; name: string; kind: SubjectKind; thumb: string | null; versionId: string }[];
  /** Every version this turn produced that has a preview, for the full-size feed. */
  versions: VersionItem[];
};
