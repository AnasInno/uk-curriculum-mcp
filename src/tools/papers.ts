import { z } from "zod";
import { lookup } from "../data/loader.js";

// ─────────────────────────────────────────────
// Param schema
// ─────────────────────────────────────────────

export const GetPaperStructureParamsSchema = {
  board: z
    .string({ error: 'board is required (e.g. "AQA", "Edexcel", "OCR")' })
    .min(1, "board must not be empty"),
  subject: z
    .string({ error: 'subject is required (e.g. "Computer Science", "Mathematics")' })
    .min(1, "subject must not be empty"),
  level: z
    .string({ error: 'level is required (e.g. "GCSE", "A-Level")' })
    .min(1, "level must not be empty"),
  paper: z
    .string()
    .optional()
    .describe(
      'Optional: filter to a specific paper by id (e.g. "1", "2", "P1"). ' +
      "If omitted, all papers are returned.",
    ),
};

type GetPaperStructureParams = {
  board: string;
  subject: string;
  level: string;
  paper?: string | undefined;
};

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

export function handleGetPaperStructure(params: GetPaperStructureParams): object {
  const entry = lookup(params.board, params.subject, params.level);

  if (!entry) {
    return {
      error: "NOT_FOUND",
      message: `No data found for ${params.board} ${params.subject} ${params.level}. ` +
        "Use list_subjects to see available combinations.",
      params,
    };
  }

  if (!entry.paperStructure) {
    return {
      error: "NO_PAPER_STRUCTURE",
      message: `Data exists for ${params.board} ${params.subject} ${params.level} but no paper structure is available yet.`,
      available: {
        hasSpecification: !!entry.specification,
        hasAssessmentObjectives: !!entry.assessmentObjectives,
        hasGradeBoundaries: Array.isArray(entry.gradeBoundaries),
      },
      _meta: entry._meta,
    };
  }

  const ps = entry.paperStructure;

  let papers = ps.papers;

  if (params.paper) {
    papers = papers.filter(
      (p) => p.id.toLowerCase() === params.paper!.toLowerCase(),
    );
    if (papers.length === 0) {
      return {
        error: "PAPER_NOT_FOUND",
        message: `No paper with id "${params.paper}" found for ${params.board} ${params.subject} ${params.level}.`,
        availablePapers: ps.papers.map((p) => ({ id: p.id, title: p.title })),
      };
    }
  }

  return {
    board: ps.board,
    subject: ps.subject,
    level: ps.level,
    paperCount: papers.length,
    totalDurationMinutes: papers.reduce((s, p) => s + p.durationMinutes, 0),
    totalMarks: papers.reduce((s, p) => s + p.totalMarks, 0),
    papers: papers.map((p) => ({
      id: p.id,
      title: p.title,
      durationMinutes: p.durationMinutes,
      totalMarks: p.totalMarks,
      percentage: p.percentage,
      openBook: p.openBook,
      calculator: p.calculator,
      sections: p.sections?.map((s) => ({
        id: s.id,
        title: s.title,
        marks: s.marks,
        questionTypes: s.questionTypes,
        _meta: s._meta,
      })),
      _meta: p._meta,
    })),
    _meta: ps._meta,
  };
}
