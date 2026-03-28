import { describe, it, expect } from "vitest";
import { MetaSchema, AssessmentObjectiveSchema } from "../validation/schema.js";

describe("MetaSchema", () => {
  it("rejects authoritative without pageRef", () => {
    const result = MetaSchema.safeParse({
      source: "spec.pdf",
      confidence: "high",
      verifiedDate: "2026-01-01",
      verifiedBy: "agent",
      tier: "authoritative",
    });
    expect(result.success).toBe(false);
  });

  it("allows derived without pageRef", () => {
    const result = MetaSchema.safeParse({
      source: "notes.md",
      confidence: "medium",
      verifiedDate: "2026-01-01",
      verifiedBy: "agent",
      tier: "derived",
    });
    expect(result.success).toBe(true);
  });

  it("accepts authoritative with pageRef", () => {
    const result = MetaSchema.safeParse({
      source: "spec.pdf",
      pageRef: "p.12",
      confidence: "high",
      verifiedDate: "2026-01-01",
      verifiedBy: "agent",
      tier: "authoritative",
    });
    expect(result.success).toBe(true);
  });
});

describe("AssessmentObjectiveSchema", () => {
  const validMeta = {
    source: "spec.pdf",
    pageRef: "p.8",
    confidence: "high" as const,
    verifiedDate: "2026-01-01",
    verifiedBy: "agent" as const,
    tier: "authoritative" as const,
  };

  it("rejects weightingMin > weightingMax", () => {
    const result = AssessmentObjectiveSchema.safeParse({
      id: "AO1",
      title: "Use and apply",
      description: "Test",
      weightingMin: 50,
      weightingMax: 40,
      _meta: validMeta,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid weighting range", () => {
    const result = AssessmentObjectiveSchema.safeParse({
      id: "AO1",
      title: "Use and apply",
      description: "Test",
      weightingMin: 40,
      weightingMax: 50,
      _meta: validMeta,
    });
    expect(result.success).toBe(true);
  });
});
