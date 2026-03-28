import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { CurriculumDataFileSchema } from "../validation/schema.js";
import type { CurriculumDataFileOutput } from "../validation/schema.js";

// ─────────────────────────────────────────────
// Index key helpers
// ─────────────────────────────────────────────

function normalise(s: string): string {
  return s.toLowerCase().trim();
}

function indexKey(board: string, subject: string, level: string): string {
  return `${normalise(board)}::${normalise(subject)}::${normalise(level)}`;
}

// ─────────────────────────────────────────────
// Loader state
// ─────────────────────────────────────────────

type DataIndex = Map<string, CurriculumDataFileOutput>;

let _index: DataIndex | null = null;
let _loadedAt: Date | null = null;

// ─────────────────────────────────────────────
// Recursive JSON file discovery
// ─────────────────────────────────────────────

function collectJsonFiles(dir: string): string[] {
  const results: string[] = [];

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    // Directory might not exist yet (no data loaded)
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

// ─────────────────────────────────────────────
// Load & validate a single file
// ─────────────────────────────────────────────

function loadFile(filePath: string): CurriculumDataFileOutput | null {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.warn(`[loader] Failed to parse JSON: ${filePath}`, err);
    return null;
  }

  const result = CurriculumDataFileSchema.safeParse(raw);
  if (!result.success) {
    console.warn(
      `[loader] Validation failed for ${filePath}:`,
      result.error.issues.map((i) => `  • ${i.path.join(".")} — ${i.message}`).join("\n"),
    );
    return null;
  }

  const data = result.data;

  // Confidence warnings
  const confidence = data._meta.confidence;
  if (confidence === "low") {
    console.warn(
      `[loader] ⚠ LOW confidence data: ${filePath} — treat with caution`,
    );
  } else if (confidence === "medium") {
    console.warn(
      `[loader] ℹ MEDIUM confidence data: ${filePath} — verify before use`,
    );
  }

  return data;
}

// ─────────────────────────────────────────────
// Main load function — call once at startup
// ─────────────────────────────────────────────

export function loadAllData(dataDir?: string): DataIndex {
  if (_index !== null) return _index;

  // Resolve data/ relative to this file's package root
  const pkgRoot = fileURLToPath(new URL("../../../", import.meta.url));
  const resolvedDir = dataDir ?? join(pkgRoot, "data");

  const files = collectJsonFiles(resolvedDir);

  if (files.length === 0) {
    console.warn(
      `[loader] No data files found in ${resolvedDir}. ` +
      "Add JSON files to the data/ directory to populate the server.",
    );
  }

  _index = new Map<string, CurriculumDataFileOutput>();

  for (const filePath of files) {
    const data = loadFile(filePath);
    if (!data) continue;

    const key = indexKey(data.board, data.subject, data.level);
    if (_index.has(key)) {
      console.warn(
        `[loader] Duplicate entry for key "${key}" — ${filePath} will overwrite existing entry`,
      );
    }
    _index.set(key, data);
  }

  _loadedAt = new Date();
  console.error(
    `[loader] Loaded ${_index.size} curriculum record(s) from ${resolvedDir} at ${_loadedAt.toISOString()}`,
  );

  return _index;
}

// ─────────────────────────────────────────────
// Public accessors
// ─────────────────────────────────────────────

export function getIndex(): DataIndex {
  return loadAllData();
}

export function lookup(
  board: string,
  subject: string,
  level: string,
): CurriculumDataFileOutput | undefined {
  return getIndex().get(indexKey(board, subject, level));
}

export function listAll(): CurriculumDataFileOutput[] {
  return Array.from(getIndex().values());
}

export function getLoadedAt(): Date | null {
  return _loadedAt;
}

/** For testing: force a reload on next access */
export function invalidateCache(): void {
  _index = null;
  _loadedAt = null;
}
