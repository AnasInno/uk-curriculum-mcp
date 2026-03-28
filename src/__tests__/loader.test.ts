import { describe, it, expect, beforeEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadAllData, invalidateCache } from "../data/loader.js";

const TMP = join(tmpdir(), "mcp-test-" + Date.now());

beforeEach(() => {
  invalidateCache();
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
});

describe("loader strict mode", () => {
  it("throws on invalid JSON in strict mode", () => {
    writeFileSync(join(TMP, "bad.json"), "NOT JSON");
    expect(() => loadAllData(TMP, { strict: true })).toThrowError(/STRICT MODE/);
  });

  it("throws on schema-invalid file in strict mode", () => {
    writeFileSync(join(TMP, "bad.json"), JSON.stringify({ board: "AQA" }));
    expect(() => loadAllData(TMP, { strict: true })).toThrowError(/STRICT MODE/);
  });

  it("skips broken files in non-strict mode", () => {
    writeFileSync(join(TMP, "bad.json"), "NOT JSON");
    const idx = loadAllData(TMP, { strict: false });
    expect(idx.size).toBe(0);
  });
});

describe("loader happy path", () => {
  it("loads a valid curriculum file", () => {
    const valid = {
      board: "AQA",
      subject: "Test",
      level: "GCSE",
      _meta: {
        source: "test.pdf",
        pageRef: "p.1",
        confidence: "high",
        verifiedDate: "2026-01-01",
        verifiedBy: "agent",
        tier: "authoritative",
      },
    };
    mkdirSync(join(TMP, "gcse", "aqa"), { recursive: true });
    writeFileSync(join(TMP, "gcse", "aqa", "test.json"), JSON.stringify(valid));
    const idx = loadAllData(TMP, { strict: true });
    expect(idx.size).toBe(1);
    expect(idx.get("aqa::test::gcse")?.board).toBe("AQA");
  });
});
