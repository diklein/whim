import { z } from "zod";

export const subjectKindEnum = z.enum(["component", "pattern", "text", "color", "asset"]);
export const changeTypeEnum = z.enum(["copy", "color", "layout", "feature", "asset"]);

// One structured call per turn produces this.
export const turnAnalysisSchema = z.object({
  summary: z
    .string()
    .describe("One very short sentence, past tense, plain words, about the visible design change only: what looks, reads, or is laid out differently. Under 12 words. No code, files, or implementation details. No preamble."),
  subjects: z
    .array(
      z.object({
        slug: z.string().describe("kebab-case. Reuse an existing slug or a data-whim slug when one fits."),
        name: z.string().describe("Short human name in sentence case (only the first word capitalized), 1-4 words."),
        kind: subjectKindEnum,
        parentSlug: z.string().nullable().describe("Slug of the top-level subject this belongs to. For text, the data-whim element that contains the copy. Null only when nothing contains it."),
        changeType: changeTypeEnum,
        note: z
          .string()
          .nullable()
          .describe("What changed for this subject in this turn, under 10 words, plain, past tense, design only. Null if nothing visible changed for it."),
        filePath: z.string().nullable().describe("The main file that changed for this subject."),
        codeSnippet: z
          .string()
          .nullable()
          .describe("The most relevant new code for this subject, 40 lines max, verbatim from the diff."),
        textContent: z
          .string()
          .nullable()
          .describe("For text subjects only: the new user-facing copy, verbatim from the diff's added lines, with no markup. Null for other kinds."),
      }),
    )
    .max(8)
    .describe("Subjects this turn touched. Empty if the turn changed no UI, text, color, or asset."),
});

export type TurnAnalysis = z.infer<typeof turnAnalysisSchema>;
