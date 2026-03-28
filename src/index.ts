import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadAllData } from "./data/loader.js";

import { ListSubjectsParamsSchema, handleListSubjects } from "./tools/list.js";
import {
  GetSpecificationParamsSchema,
  handleGetSpecification,
} from "./tools/specification.js";
import {
  GetPaperStructureParamsSchema,
  handleGetPaperStructure,
} from "./tools/papers.js";
import {
  GetAssessmentObjectivesParamsSchema,
  handleGetAssessmentObjectives,
} from "./tools/objectives.js";
import {
  GetGradeBoundariesParamsSchema,
  handleGetGradeBoundaries,
} from "./tools/boundaries.js";

// ─────────────────────────────────────────────
// Boot: pre-load all data at startup
// ─────────────────────────────────────────────

loadAllData();

// ─────────────────────────────────────────────
// MCP Server
// ─────────────────────────────────────────────

const server = new McpServer(
  {
    name: "uk-curriculum-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
    instructions:
      "This server provides structured UK curriculum data (specifications, paper structures, " +
      "assessment objectives, and grade boundaries) for GCSE and A-Level subjects across " +
      "AQA, Edexcel, OCR, and other UK exam boards. " +
      "All data includes provenance metadata (_meta) indicating the source, confidence, and verification status. " +
      "Grade boundary data is HISTORICAL ONLY and must never be used for prediction.",
  },
);

// ─────────────────────────────────────────────
// Tool: list_subjects
// ─────────────────────────────────────────────

server.tool(
  "list_subjects",
  "List all available subjects in the curriculum database. " +
  "Optionally filter by exam board (e.g. AQA, Edexcel) or qualification level (e.g. GCSE, A-Level). " +
  "Returns metadata about what data is available for each subject.",
  ListSubjectsParamsSchema,
  async (params) => {
    const result = handleListSubjects(params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

// ─────────────────────────────────────────────
// Tool: get_specification
// ─────────────────────────────────────────────

server.tool(
  "get_specification",
  "Get the full topic specification for a subject. " +
  "Returns the topic hierarchy (topic areas → subtopics) with key terms and provenance metadata. " +
  "All content comes directly from the official specification document.",
  GetSpecificationParamsSchema,
  async (params) => {
    const result = handleGetSpecification(params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

// ─────────────────────────────────────────────
// Tool: get_paper_structure
// ─────────────────────────────────────────────

server.tool(
  "get_paper_structure",
  "Get the assessment/paper structure for a subject. " +
  "Returns information about each exam paper: duration, marks, percentage weighting, " +
  "calculator/open-book status, and section breakdown. " +
  "Optionally filter to a specific paper by its id.",
  GetPaperStructureParamsSchema,
  async (params) => {
    const result = handleGetPaperStructure(params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

// ─────────────────────────────────────────────
// Tool: get_assessment_objectives
// ─────────────────────────────────────────────

server.tool(
  "get_assessment_objectives",
  "Get the assessment objectives (AOs) for a subject. " +
  "Returns each objective with its title, description, and percentage weighting range. " +
  "Assessment objectives define the skills and knowledge that examiners assess.",
  GetAssessmentObjectivesParamsSchema,
  async (params) => {
    const result = handleGetAssessmentObjectives(params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

// ─────────────────────────────────────────────
// Tool: get_grade_boundaries
// ─────────────────────────────────────────────

server.tool(
  "get_grade_boundaries",
  "Get historical grade boundaries for a subject. " +
  "Returns the minimum marks required for each grade in past exam series. " +
  "IMPORTANT: This is historical data only and must NOT be used to predict future grade boundaries. " +
  "Optionally filter by year or tier (foundation/higher for GCSE).",
  GetGradeBoundariesParamsSchema,
  async (params) => {
    const result = handleGetGradeBoundaries(params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

// ─────────────────────────────────────────────
// Start with stdio transport
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[uk-curriculum-mcp] Server running on stdio transport");
}

main().catch((err) => {
  console.error("[uk-curriculum-mcp] Fatal error:", err);
  process.exit(1);
});
