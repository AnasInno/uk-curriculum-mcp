// ─────────────────────────────────────────────
// Core provenance / trust metadata
// Every data object MUST carry this field.
// ─────────────────────────────────────────────

export interface Meta {
  /** URL or name of the primary source (e.g. "AQA spec 7702 2024") */
  source: string;
  /** Human-readable document title (e.g. "AQA GCSE Computer Science Specification") */
  sourceDocument?: string;
  /** Page number(s) in the source document (e.g. "12", "12-15") */
  pageRef?: string;
  /** How confident we are that this data is accurate */
  confidence: "high" | "medium" | "low";
  /** ISO 8601 date when this data was last verified (e.g. "2024-09-01") */
  verifiedDate: string;
  /** Who verified it – a human or an AI agent */
  verifiedBy?: "human" | "agent";
  /**
   * "authoritative" = straight from the spec/board document.
   * "derived"       = inferred, calculated, or secondary source.
   */
  tier: "authoritative" | "derived";
}

// ─────────────────────────────────────────────
// Subject index (list_subjects)
// ─────────────────────────────────────────────

export type Level = "GCSE" | "A-Level" | "AS-Level" | "BTEC" | "T-Level";
export type Board = "AQA" | "Edexcel" | "OCR" | "WJEC" | "CCEA" | "Cambridge";

export interface SubjectEntry {
  board: Board;
  subject: string;
  level: Level;
  code?: string;
  _meta: Meta;
}

// ─────────────────────────────────────────────
// Topic hierarchy
// ─────────────────────────────────────────────

export interface Subtopic {
  id: string;
  title: string;
  description?: string;
  keyTerms?: string[];
  _meta: Meta;
}

export interface TopicArea {
  id: string;
  title: string;
  description?: string;
  subtopics: Subtopic[];
  _meta: Meta;
}

// ─────────────────────────────────────────────
// Specification
// ─────────────────────────────────────────────

export interface Specification {
  board: Board;
  subject: string;
  level: Level;
  code: string;
  title: string;
  firstExamYear?: number;
  topics: TopicArea[];
  _meta: Meta;
}

// ─────────────────────────────────────────────
// Paper / assessment structure
// ─────────────────────────────────────────────

export interface Paper {
  id: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  percentage: number;
  openBook?: boolean;
  calculator?: boolean | "allowed" | "not-allowed" | "required";
  sections?: PaperSection[];
  _meta: Meta;
}

export interface PaperSection {
  id: string;
  title: string;
  marks: number;
  questionTypes?: string[];
  _meta: Meta;
}

export interface PaperStructure {
  board: Board;
  subject: string;
  level: Level;
  papers: Paper[];
  _meta: Meta;
}

// ─────────────────────────────────────────────
// Assessment objectives
// ─────────────────────────────────────────────

export interface AssessmentObjective {
  id: string;
  title: string;
  description: string;
  weightingMin?: number;
  weightingMax?: number;
  _meta: Meta;
}

export interface AssessmentObjectives {
  board: Board;
  subject: string;
  level: Level;
  objectives: AssessmentObjective[];
  _meta: Meta;
}

// ─────────────────────────────────────────────
// Grade boundaries
// ─────────────────────────────────────────────

export interface GradeBoundary {
  grade: string;
  minMark: number;
  maxMark?: number;
  percentage?: number;
  _meta: Meta;
}

export interface GradeBoundarySet {
  board: Board;
  subject: string;
  level: Level;
  year: number;
  series?: string;
  tier?: "foundation" | "higher" | "all";
  paperCode?: string;
  boundaries: GradeBoundary[];
  /** Always included in tool response to make the non-predictive nature explicit. */
  note: "Historical data only. Not predictive.";
  _meta: Meta;
}

// ─────────────────────────────────────────────
// Root data file shape
// Each JSON file in data/ must match this.
// ─────────────────────────────────────────────

export interface CurriculumDataFile {
  board: Board;
  subject: string;
  level: Level;
  specification?: Specification;
  paperStructure?: PaperStructure;
  assessmentObjectives?: AssessmentObjectives;
  gradeBoundaries?: GradeBoundarySet[];
  _meta: Meta;
}
