import { z } from "zod";
import { lookup } from "../data/loader.js";

// ─────────────────────────────────────────────
// Param schema
// ─────────────────────────────────────────────

export const GetSpecificationParamsSchema = {
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

type GetSpecificationParams = {
  board: string;
  subject: string;
  level: string;
};

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

export function handleGetSpecification(params: GetSpecificationParams): object {
  const entry = lookup(params.board, params.subject, params.level);

  if (!entry) {
    return {
      error: "NOT_FOUND",
      message: `No data found for ${params.board} ${params.subject} ${params.level}. ` +
        "Use list_subjects to see available combinations.",
      params,
    };
  }

  if (!entry.specification) {
    return {
      error: "NO_SPECIFICATION",
      message: `Data exists for ${params.board} ${params.subject} ${params.level} but no specification is available yet.`,
      available: {
        hasPaperStructure: !!entry.paperStructure,
        hasAssessmentObjectives: !!entry.assessmentObjectives,
        hasGradeBoundaries: Array.isArray(entry.gradeBoundaries),
      },
      _meta: entry._meta,
    };
  }

  const spec = entry.specification;

  return {
    board: spec.board,
    subject: spec.subject,
    level: spec.level,
    code: spec.code,
    title: spec.title,
    firstExamYear: spec.firstExamYear,
    topicCount: spec.topics.length,
    topics: spec.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      subtopicCount: topic.subtopics.length,
      subtopics: topic.subtopics.map((sub) => ({
        id: sub.id,
        title: sub.title,
        description: sub.description,
        keyTerms: sub.keyTerms,
        _meta: sub._meta,
      })),
      _meta: topic._meta,
    })),
    _meta: spec._meta,
  };
}
