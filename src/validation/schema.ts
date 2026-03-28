import { z } from "zod";

// ─────────────────────────────────────────────
// Meta schema — every data object must have this
// ─────────────────────────────────────────────

export const MetaSchema = z.object({
  source: z.string({
    error: "_meta.source is required — provide the specification document name or URL",
  }).min(1, "_meta.source must not be empty"),

  sourceDocument: z.string().optional(),

  pageRef: z.string().optional(),

  confidence: z.enum(["high", "medium", "low"], {
    error: '_meta.confidence must be "high", "medium", or "low"',
  }),

  verifiedDate: z.string({
    error: "_meta.verifiedDate is required — use ISO 8601 format (e.g. 2024-09-01)",
  }).regex(/^\d{4}-\d{2}-\d{2}$/, "_meta.verifiedDate must be in YYYY-MM-DD format"),

  verifiedBy: z.enum(["human", "agent"]).optional(),

  tier: z.enum(["authoritative", "derived"], {
    error: '_meta.tier must be "authoritative" or "derived"',
  }),
});

export type MetaInput = z.input<typeof MetaSchema>;
export type MetaOutput = z.output<typeof MetaSchema>;

// ─────────────────────────────────────────────
// Subtopic
// ─────────────────────────────────────────────

export const SubtopicSchema = z.object({
  id: z.string().min(1, "subtopic.id must not be empty"),
  title: z.string().min(1, "subtopic.title must not be empty"),
  description: z.string().optional(),
  keyTerms: z.array(z.string()).optional(),
  _meta: MetaSchema,
});

// ─────────────────────────────────────────────
// Topic Area
// ─────────────────────────────────────────────

export const TopicAreaSchema = z.object({
  id: z.string().min(1, "topicArea.id must not be empty"),
  title: z.string().min(1, "topicArea.title must not be empty"),
  description: z.string().optional(),
  subtopics: z.array(SubtopicSchema),
  _meta: MetaSchema,
});

// ─────────────────────────────────────────────
// Specification
// ─────────────────────────────────────────────

export const SpecificationSchema = z.object({
  board: z.string().min(1),
  subject: z.string().min(1),
  level: z.string().min(1),
  code: z.string().min(1, "specification.code (e.g. 7702) must not be empty"),
  title: z.string().min(1),
  firstExamYear: z.number().int().optional(),
  topics: z.array(TopicAreaSchema),
  _meta: MetaSchema,
});

// ─────────────────────────────────────────────
// Paper Section
// ─────────────────────────────────────────────

export const PaperSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  marks: z.number().int().nonnegative(),
  questionTypes: z.array(z.string()).optional(),
  _meta: MetaSchema,
});

// ─────────────────────────────────────────────
// Paper
// ─────────────────────────────────────────────

export const PaperSchema = z.object({
  id: z.string().min(1, "paper.id must not be empty"),
  title: z.string().min(1),
  durationMinutes: z.number().int().positive("paper.durationMinutes must be a positive integer"),
  totalMarks: z.number().int().positive(),
  percentage: z.number().min(0).max(100),
  openBook: z.boolean().optional(),
  calculator: z.union([
    z.boolean(),
    z.enum(["allowed", "not-allowed", "required"]),
  ]).optional(),
  sections: z.array(PaperSectionSchema).optional(),
  _meta: MetaSchema,
});

// ─────────────────────────────────────────────
// Paper Structure
// ─────────────────────────────────────────────

export const PaperStructureSchema = z.object({
  board: z.string().min(1),
  subject: z.string().min(1),
  level: z.string().min(1),
  papers: z.array(PaperSchema),
  _meta: MetaSchema,
});

// ─────────────────────────────────────────────
// Assessment Objective
// ─────────────────────────────────────────────

export const AssessmentObjectiveSchema = z.object({
  id: z.string().min(1, "assessmentObjective.id must not be empty"),
  title: z.string().min(1),
  description: z.string().min(1),
  weightingMin: z.number().min(0).max(100).optional(),
  weightingMax: z.number().min(0).max(100).optional(),
  _meta: MetaSchema,
});

// ─────────────────────────────────────────────
// Assessment Objectives (container)
// ─────────────────────────────────────────────

export const AssessmentObjectivesSchema = z.object({
  board: z.string().min(1),
  subject: z.string().min(1),
  level: z.string().min(1),
  objectives: z.array(AssessmentObjectiveSchema),
  _meta: MetaSchema,
});

// ─────────────────────────────────────────────
// Grade Boundary
// ─────────────────────────────────────────────

export const GradeBoundarySchema = z.object({
  grade: z.string().min(1, "gradeBoundary.grade must not be empty"),
  minMark: z.number().int().nonnegative(),
  maxMark: z.number().int().nonnegative().optional(),
  percentage: z.number().min(0).max(100).optional(),
  _meta: MetaSchema,
});

// ─────────────────────────────────────────────
// Grade Boundary Set
// ─────────────────────────────────────────────

export const GradeBoundarySetSchema = z.object({
  board: z.string().min(1),
  subject: z.string().min(1),
  level: z.string().min(1),
  year: z.number().int().positive("gradeBoundarySet.year must be a positive integer"),
  series: z.string().optional(),
  tier: z.enum(["foundation", "higher", "all"]).optional(),
  paperCode: z.string().optional(),
  boundaries: z.array(GradeBoundarySchema),
  note: z.literal("Historical data only. Not predictive."),
  _meta: MetaSchema,
});

// ─────────────────────────────────────────────
// Root data file schema
// ─────────────────────────────────────────────

export const CurriculumDataFileSchema = z.object({
  board: z.string().min(1, "board is required (e.g. AQA, Edexcel, OCR)"),
  subject: z.string().min(1, "subject is required (e.g. Computer Science)"),
  level: z.string().min(1, "level is required (e.g. GCSE, A-Level)"),
  specification: SpecificationSchema.optional(),
  paperStructure: PaperStructureSchema.optional(),
  assessmentObjectives: AssessmentObjectivesSchema.optional(),
  gradeBoundaries: z.array(GradeBoundarySetSchema).optional(),
  _meta: MetaSchema,
});

export type CurriculumDataFileInput = z.input<typeof CurriculumDataFileSchema>;
export type CurriculumDataFileOutput = z.output<typeof CurriculumDataFileSchema>;
