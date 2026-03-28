import { z } from "zod";
import { lookup } from "../data/loader.js";

// ─────────────────────────────────────────────
// Param schema
// ─────────────────────────────────────────────

export const GetGradeBoundariesParamsSchema = {
  board: z
    .string({ error: 'board is required (e.g. "AQA", "Edexcel", "OCR")' })
    .min(1, "board must not be empty"),
  subject: z
    .string({ error: 'subject is required (e.g. "Computer Science", "Mathematics")' })
    .min(1, "subject must not be empty"),
  level: z
    .string({ error: 'level is required (e.g. "GCSE", "A-Level")' })
    .min(1, "level must not be empty"),
  year: z
    .number({ error: "year must be a number (e.g. 2023)" })
    .int("year must be an integer")
    .min(2000, "year must be 2000 or later")
    .max(2100, "year must be 2100 or earlier")
    .optional()
    .describe("Optional: filter to a specific exam year (e.g. 2023)."),
  tier: z
    .enum(["foundation", "higher", "all"], {
      error: 'tier must be "foundation", "higher", or "all"',
    })
    .optional()
    .describe('Optional: filter by tier ("foundation", "higher", "all"). GCSE only.'),
};

type GetGradeBoundariesParams = {
  board: string;
  subject: string;
  level: string;
  year?: number | undefined;
  tier?: "foundation" | "higher" | "all" | undefined;
};

// ─────────────────────────────────────────────
// Mandatory disclaimer
// ─────────────────────────────────────────────

const BOUNDARY_NOTE = "Historical data only. Not predictive." as const;

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

export function handleGetGradeBoundaries(
  params: GetGradeBoundariesParams,
): object {
  const entry = lookup(params.board, params.subject, params.level);

  if (!entry) {
    return {
      error: "NOT_FOUND",
      message: `No data found for ${params.board} ${params.subject} ${params.level}. ` +
        "Use list_subjects to see available combinations.",
      note: BOUNDARY_NOTE,
      params,
    };
  }

  if (!entry.gradeBoundaries || entry.gradeBoundaries.length === 0) {
    return {
      error: "NO_GRADE_BOUNDARIES",
      message: `Data exists for ${params.board} ${params.subject} ${params.level} but no grade boundaries are available yet.`,
      note: BOUNDARY_NOTE,
      available: {
        hasSpecification: !!entry.specification,
        hasPaperStructure: !!entry.paperStructure,
        hasAssessmentObjectives: !!entry.assessmentObjectives,
      },
      _meta: entry._meta,
    };
  }

  let sets = entry.gradeBoundaries;

  if (params.year !== undefined) {
    sets = sets.filter((s) => s.year === params.year);
  }

  if (params.tier !== undefined) {
    sets = sets.filter(
      (s) => !s.tier || s.tier === params.tier,
    );
  }

  if (sets.length === 0) {
    const availableYears = [...new Set(entry.gradeBoundaries.map((s) => s.year))].sort();
    const availableTiers = [...new Set(entry.gradeBoundaries.map((s) => s.tier).filter(Boolean))];
    return {
      error: "NO_MATCHING_BOUNDARIES",
      message: "No grade boundaries match the specified filters.",
      note: BOUNDARY_NOTE,
      filters: {
        year: params.year ?? null,
        tier: params.tier ?? null,
      },
      availableYears,
      availableTiers,
    };
  }

  return {
    board: params.board,
    subject: params.subject,
    level: params.level,
    note: BOUNDARY_NOTE,
    setCount: sets.length,
    filters: {
      year: params.year ?? null,
      tier: params.tier ?? null,
    },
    boundarySets: sets.map((s) => ({
      year: s.year,
      series: s.series,
      tier: s.tier,
      paperCode: s.paperCode,
      boundaries: s.boundaries.map((b) => ({
        grade: b.grade,
        minMark: b.minMark,
        maxMark: b.maxMark,
        percentage: b.percentage,
        _meta: b._meta,
      })),
      _meta: s._meta,
    })),
  };
}
