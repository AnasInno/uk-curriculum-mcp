import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { invalidateCache, loadAllData } from "../data/loader.js";
import { handleListSubjects } from "../tools/list.js";
import { handleGetSpecification } from "../tools/specification.js";
import { handleGetPaperStructure } from "../tools/papers.js";

const DATA_DIR = join(fileURLToPath(new URL("../../", import.meta.url)), "data");

beforeAll(() => {
  invalidateCache();
  loadAllData(DATA_DIR, { strict: true });
});

describe("list_subjects tool", () => {
  it("returns all loaded subjects", () => {
    const result = handleListSubjects({}) as any;
    expect(result.count).toBeGreaterThanOrEqual(2);
    expect(result.subjects.some((s: any) => s.subject === "Mathematics")).toBe(true);
  });

  it("filters by board", () => {
    const result = handleListSubjects({ board: "AQA" }) as any;
    expect(result.subjects.every((s: any) => s.board === "AQA")).toBe(true);
  });
});

describe("get_specification tool", () => {
  it("returns maths spec with topics", () => {
    const result = handleGetSpecification({ board: "AQA", subject: "Mathematics", level: "GCSE" }) as any;
    expect(result.code).toBe("8300");
    expect(result.topics.length).toBeGreaterThanOrEqual(5);
  });

  it("returns not-found for missing subject", () => {
    const result = handleGetSpecification({ board: "AQA", subject: "Basket Weaving", level: "GCSE" }) as any;
    expect(result.error).toBeDefined();
  });
});

describe("get_paper_structure tool", () => {
  it("returns 6 papers for AQA Maths", () => {
    const result = handleGetPaperStructure({ board: "AQA", subject: "Mathematics", level: "GCSE" }) as any;
    expect(result.papers.length).toBe(6);
  });

  it("filters to single paper by id", () => {
    const result = handleGetPaperStructure({ board: "AQA", subject: "Mathematics", level: "GCSE", paper: "8300/1H" }) as any;
    expect(result.papers.length).toBe(1);
    expect(result.papers[0].id).toBe("8300/1H");
  });
});
