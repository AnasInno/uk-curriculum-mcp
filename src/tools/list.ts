import { z } from "zod";
import { listAll } from "../data/loader.js";

// ─────────────────────────────────────────────
// Param schema
// ─────────────────────────────────────────────

export const ListSubjectsParamsSchema = {
  board: z
    .string()
    .optional()
    .describe(
      'Filter by exam board (e.g. "AQA", "Edexcel", "OCR"). Case-insensitive.',
    ),
  level: z
    .string()
    .optional()
    .describe(
      'Filter by qualification level (e.g. "GCSE", "A-Level"). Case-insensitive.',
    ),
};

type ListSubjectsParams = {
  board?: string | undefined;
  level?: string | undefined;
};

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

export function handleListSubjects(params: ListSubjectsParams): object {
  const all = listAll();

  const filtered = all.filter((entry) => {
    if (
      params.board &&
      entry.board.toLowerCase() !== params.board.toLowerCase()
    ) {
      return false;
    }
    if (
      params.level &&
      entry.level.toLowerCase() !== params.level.toLowerCase()
    ) {
      return false;
    }
    return true;
  });

  const subjects = filtered.map((entry) => ({
    board: entry.board,
    subject: entry.subject,
    level: entry.level,
    code: entry.specification?.code,
    hasSpecification: !!entry.specification,
    hasPaperStructure: !!entry.paperStructure,
    hasAssessmentObjectives: !!entry.assessmentObjectives,
    hasGradeBoundaries:
      Array.isArray(entry.gradeBoundaries) && entry.gradeBoundaries.length > 0,
    _meta: entry._meta,
  }));

  return {
    count: subjects.length,
    filters: {
      board: params.board ?? null,
      level: params.level ?? null,
    },
    subjects,
  };
}
