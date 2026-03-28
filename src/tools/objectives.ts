import { z } from "zod";
import { lookup } from "../data/loader.js";

// ─────────────────────────────────────────────
// Param schema
// ─────────────────────────────────────────────

export const GetAssessmentObjectivesParamsSchema = {
  board: z
    .string({ error: 'board is required (e.g. "AQA", "Edexcel", "OCR")' })
    .min(1, "board must not be empty"),
  subject: z
    .string({ error: 'subject is required (e.g. "Computer Science", "Mathematics")' })
    .min(1, "subject must not be empty"),
  level: z
    .string({ error: 'level is required (e.g. "GCSE", "A-Level")' })
    .min(1, "level must not be empty"),
};

type GetAssessmentObjectivesParams = {
  board: string;
  subject: string;
  level: string;
};

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

export function handleGetAssessmentObjectives(
  params: GetAssessmentObjectivesParams,
): object {
  const entry = lookup(params.board, params.subject, params.level);

  if (!entry) {
    return {
      error: "NOT_FOUND",
      message: `No data found for ${params.board} ${params.subject} ${params.level}. ` +
        "Use list_subjects to see available combinations.",
      params,
    };
  }

  if (!entry.assessmentObjectives) {
    return {
      error: "NO_ASSESSMENT_OBJECTIVES",
      message: `Data exists for ${params.board} ${params.subject} ${params.level} but no assessment objectives are available yet.`,
      available: {
        hasSpecification: !!entry.specification,
        hasPaperStructure: !!entry.paperStructure,
        hasGradeBoundaries: Array.isArray(entry.gradeBoundaries),
      },
      _meta: entry._meta,
    };
  }

  const ao = entry.assessmentObjectives;

  return {
    board: ao.board,
    subject: ao.subject,
    level: ao.level,
    objectiveCount: ao.objectives.length,
    objectives: ao.objectives.map((obj) => ({
      id: obj.id,
      title: obj.title,
      description: obj.description,
      weightingMin: obj.weightingMin,
      weightingMax: obj.weightingMax,
      _meta: obj._meta,
    })),
    _meta: ao._meta,
  };
}
