#!/usr/bin/env node
/**
 * validate-data.ts
 *
 * CLI script to validate all data/*.json files against the Zod schemas.
 * Reports confidence distribution and exits with code 1 if any authoritative
 * field is missing source or pageRef.
 *
 * Usage:
 *   npx tsx scripts/validate-data.ts [data-dir]
 *   node --experimental-strip-types scripts/validate-data.ts [data-dir]
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CurriculumDataFileSchema } from "../src/validation/schema.js";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function collectJsonFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectJsonFiles(fullPath));
    } else if (stat.isFile() && extname(entry) === ".json") {
      results.push(fullPath);
    }
  }
  return results;
}

interface ValidationSummary {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

type Confidence = "high" | "medium" | "low";

interface ConfidenceDist {
  high: number;
  medium: number;
  low: number;
}

// ─────────────────────────────────────────────
// Deep walk: find all _meta objects in a value
// ─────────────────────────────────────────────

function* walkMeta(
  value: unknown,
  path: string,
): Generator<{ path: string; meta: Record<string, unknown> }> {
  if (value === null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      yield* walkMeta(value[i], `${path}[${i}]`);
    }
    return;
  }

  const obj = value as Record<string, unknown>;
  if ("_meta" in obj && typeof obj["_meta"] === "object" && obj["_meta"] !== null) {
    yield { path, meta: obj["_meta"] as Record<string, unknown> };
  }

  for (const [key, val] of Object.entries(obj)) {
    if (key !== "_meta") {
      yield* walkMeta(val, path ? `${path}.${key}` : key);
    }
  }
}

// ─────────────────────────────────────────────
// Validate a single file
// ─────────────────────────────────────────────

function validateFile(filePath: string): {
  summary: ValidationSummary;
  confidenceDist: ConfidenceDist;
} {
  const summary: ValidationSummary = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
  };
  const confidenceDist: ConfidenceDist = { high: 0, medium: 0, low: 0 };

  // Parse JSON
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    summary.valid = false;
    summary.errors.push(`JSON parse error: ${String(err)}`);
    return { summary, confidenceDist };
  }

  // Zod validation
  const result = CurriculumDataFileSchema.safeParse(raw);
  if (!result.success) {
    summary.valid = false;
    for (const issue of result.error.issues) {
      summary.errors.push(`${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    return { summary, confidenceDist };
  }

  const data = result.data;

  // Walk all _meta objects and check:
  //  1. Confidence distribution
  //  2. Authoritative fields must have source + pageRef
  for (const { path, meta } of walkMeta(data, "")) {
    const confidence = meta["confidence"] as Confidence;
    const tier = meta["tier"] as string;
    const source = meta["source"] as string | undefined;
    const pageRef = meta["pageRef"] as string | undefined;

    if (confidence === "high") confidenceDist.high++;
    else if (confidence === "medium") confidenceDist.medium++;
    else if (confidence === "low") confidenceDist.low++;

    if (confidence === "medium") {
      summary.warnings.push(`⚠  MEDIUM confidence at ${path || "(root)"} — verify before publishing`);
    }
    if (confidence === "low") {
      summary.warnings.push(`⚠  LOW confidence at ${path || "(root)"} — do not publish without review`);
    }

    if (tier === "authoritative") {
      if (!source || source.trim() === "") {
        summary.valid = false;
        summary.errors.push(
          `✗  Authoritative object at "${path || "(root)"}" is missing _meta.source`,
        );
      }
      if (!pageRef || pageRef.trim() === "") {
        summary.valid = false;
        summary.errors.push(
          `✗  Authoritative object at "${path || "(root)"}" is missing _meta.pageRef`,
        );
      }
    }
  }

  return { summary, confidenceDist };
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function main(): void {
  const pkgRoot = fileURLToPath(new URL("../", import.meta.url));
  const dataDirArg = process.argv[2];
  const dataDir = dataDirArg
    ? resolve(dataDirArg)
    : join(pkgRoot, "data");

  console.log(`\n🔍  Validating data files in: ${dataDir}\n`);

  const files = collectJsonFiles(dataDir);

  if (files.length === 0) {
    console.log("ℹ  No JSON files found. Nothing to validate.\n");
    process.exit(0);
  }

  let totalFiles = 0;
  let validFiles = 0;
  let invalidFiles = 0;
  const totalDist: ConfidenceDist = { high: 0, medium: 0, low: 0 };
  const allSummaries: ValidationSummary[] = [];

  for (const filePath of files) {
    totalFiles++;
    const { summary, confidenceDist } = validateFile(filePath);
    allSummaries.push(summary);
    totalDist.high += confidenceDist.high;
    totalDist.medium += confidenceDist.medium;
    totalDist.low += confidenceDist.low;
    if (summary.valid) {
      validFiles++;
    } else {
      invalidFiles++;
    }
  }

  // Print per-file results
  for (const s of allSummaries) {
    const icon = s.valid ? "✅" : "❌";
    const relPath = s.file.replace(pkgRoot, "");
    console.log(`${icon} ${relPath}`);

    for (const err of s.errors) {
      console.log(`     ${err}`);
    }
    for (const warn of s.warnings) {
      console.log(`     ${warn}`);
    }
    if (s.errors.length === 0 && s.warnings.length === 0) {
      console.log("     No issues.");
    }
    console.log();
  }

  // Confidence distribution
  const totalMeta = totalDist.high + totalDist.medium + totalDist.low;
  console.log("─────────────────────────────────────────");
  console.log("📊  Confidence distribution across all _meta fields:");
  if (totalMeta > 0) {
    const pct = (n: number) =>
      totalMeta > 0 ? `${((n / totalMeta) * 100).toFixed(1)}%` : "—";
    console.log(`   🟢 high:   ${totalDist.high.toString().padStart(4)}  (${pct(totalDist.high)})`);
    console.log(`   🟡 medium: ${totalDist.medium.toString().padStart(4)}  (${pct(totalDist.medium)})`);
    console.log(`   🔴 low:    ${totalDist.low.toString().padStart(4)}  (${pct(totalDist.low)})`);
  } else {
    console.log("   (no _meta fields found)");
  }

  // Summary
  console.log("─────────────────────────────────────────");
  console.log(`📁  Files: ${totalFiles} total, ${validFiles} valid, ${invalidFiles} invalid`);

  if (invalidFiles > 0) {
    console.log(`\n❌  Validation failed — ${invalidFiles} file(s) have errors.\n`);
    process.exit(1);
  } else {
    console.log("\n✅  All files are valid.\n");
    process.exit(0);
  }
}

main();
