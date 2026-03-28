#!/usr/bin/env npx tsx
/**
 * extract-from-pdf.ts — Extract curriculum data from an exam board spec PDF
 * 
 * Usage: npx tsx scripts/extract-from-pdf.ts <pdf-path> <board> <subject> <level>
 * Example: npx tsx scripts/extract-from-pdf.ts pdfs/aqa-8300-spec.pdf AQA Mathematics GCSE
 * 
 * Requires: ANTHROPIC_API_KEY env var (or Claude Max via `claude` CLI)
 * 
 * What it does:
 *   1. Reads the PDF natively via Anthropic's PDF support
 *   2. Sends one structured extraction prompt with the CurriculumDataFile schema
 *   3. Validates output against Zod schema
 *   4. Writes to data/{level}/{board}/{subject}.json
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";
import { CurriculumDataFileSchema } from "../src/validation/schema.js";

const SCHEMA_PROMPT = `Extract structured curriculum data from this exam board specification PDF.
Return ONLY valid JSON matching this exact schema — no markdown, no explanation, just the JSON object.

Required structure:
{
  "board": "<exam board>",
  "subject": "<subject name>",
  "level": "<GCSE|A-Level|etc>",
  "_meta": { "source": "<filename>", "pageRef": "cover", "confidence": "high", "verifiedDate": "<today>", "verifiedBy": "agent", "tier": "authoritative" },
  "specification": {
    "board": "...", "subject": "...", "level": "...", "code": "<spec code>",
    "title": "<full title>",
    "firstExamYear": <year>,
    "topics": [
      {
        "id": "topic-<N>",
        "title": "<content domain name>",
        "description": "<brief description>",
        "subtopics": [
          { "id": "<code>", "title": "<heading from spec>", "_meta": { "source": "<filename>", "pageRef": "p.<N>", "confidence": "high", "verifiedDate": "<today>", "verifiedBy": "agent", "tier": "authoritative" } }
        ],
        "_meta": { "source": "<filename>", "pageRef": "p.<N>", "confidence": "high", "verifiedDate": "<today>", "verifiedBy": "agent", "tier": "authoritative" }
      }
    ],
    "_meta": { ... }
  },
  "paperStructure": {
    "board": "...", "subject": "...", "level": "...",
    "papers": [
      { "id": "<paper code>", "title": "<paper name>", "durationMinutes": <N>, "totalMarks": <N>, "percentage": <N>, "calculator": <boolean|"allowed"|"not-allowed">, "sections": [], "_meta": { ... } }
    ],
    "_meta": { ... }
  },
  "assessmentObjectives": {
    "board": "...", "subject": "...", "level": "...",
    "objectives": [
      { "id": "AO<N>", "title": "<short name>", "description": "<full description from spec>", "weightingMin": <lower%>, "weightingMax": <higher%>, "_meta": { ... } }
    ],
    "_meta": { ... }
  },
  "gradeBoundaries": []
}

Rules:
- Every _meta.pageRef MUST cite the ACTUAL page number from the PDF (e.g. "p.8", "p.12-15")
- Include ALL content domains/topics with their sub-headings as subtopics
- Include ALL papers (both tiers if applicable)
- AO weightings: weightingMin = lower bound %, weightingMax = upper bound %
- gradeBoundaries is always [] (comes from separate documents)
- confidence is always "high" since this is the authoritative spec document
- If a paper has no calculator, set calculator to false or "not-allowed"
`;

async function main() {
  const [pdfPath, board, subject, level] = process.argv.slice(2);

  if (!pdfPath || !board || !subject || !level) {
    console.error("Usage: npx tsx scripts/extract-from-pdf.ts <pdf-path> <board> <subject> <level>");
    console.error("Example: npx tsx scripts/extract-from-pdf.ts pdfs/aqa-8300-spec.pdf AQA Mathematics GCSE");
    process.exit(1);
  }

  if (!existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  const filename = basename(pdfPath);
  const today = new Date().toISOString().split("T")[0];

  const prompt = SCHEMA_PROMPT
    .replace(/<filename>/g, filename)
    .replace(/<today>/g, today)
    .replace(/<exam board>/g, board)
    .replace(/<subject name>/g, subject)
    .replace(/<GCSE\|A-Level\|etc>/g, level);

  console.log(`📄 Reading ${pdfPath} (${board} ${subject} ${level})...`);

  // Use claude CLI with --print to leverage Max plan (zero cost)
  const pdfBase64 = readFileSync(pdfPath).toString("base64");
  
  // Write temp prompt file
  const tmpPrompt = `/tmp/mcp-extract-prompt-${Date.now()}.txt`;
  writeFileSync(tmpPrompt, prompt);

  let jsonStr: string;
  try {
    // Try claude CLI first (uses Max plan, free)
    jsonStr = execSync(
      `claude --print --model opus --output-format text < "${tmpPrompt}" --files "${pdfPath}"`,
      { maxBuffer: 10 * 1024 * 1024, timeout: 300_000 }
    ).toString().trim();
  } catch {
    console.log("⚠  claude CLI failed, falling back to direct API...");
    // Fallback: use Anthropic API directly
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("No ANTHROPIC_API_KEY and claude CLI unavailable");
      process.exit(1);
    }
    
    const body = JSON.stringify({
      model: "claude-opus-4-20250514",
      max_tokens: 16384,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: prompt }
        ]
      }]
    });
    
    const resp = execSync(`curl -s https://api.anthropic.com/v1/messages -H "x-api-key: ${apiKey}" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" -d '${body.replace(/'/g, "'\\''")}'`, 
      { maxBuffer: 10 * 1024 * 1024, timeout: 300_000 });
    const parsed = JSON.parse(resp.toString());
    jsonStr = parsed.content?.[0]?.text ?? "";
  }

  // Strip markdown fences if present
  jsonStr = jsonStr.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();

  console.log(`📝 Got ${jsonStr.length} chars of JSON`);

  // Parse and validate
  let data: unknown;
  try {
    data = JSON.parse(jsonStr);
  } catch (err) {
    console.error("❌ Invalid JSON returned");
    writeFileSync("/tmp/mcp-extract-raw.json", jsonStr);
    console.error("Raw output saved to /tmp/mcp-extract-raw.json");
    process.exit(1);
  }

  const result = CurriculumDataFileSchema.safeParse(data);
  if (!result.success) {
    console.error("❌ Schema validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  • ${issue.path.join(".")} — ${issue.message}`);
    }
    writeFileSync("/tmp/mcp-extract-raw.json", JSON.stringify(data, null, 2));
    console.error("Raw output saved to /tmp/mcp-extract-raw.json for manual fixing");
    process.exit(1);
  }

  // Write to canonical path
  const outDir = join("data", level.toLowerCase(), board.toLowerCase());
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${subject.toLowerCase().replace(/\s+/g, "-")}.json`);
  writeFileSync(outPath, JSON.stringify(result.data, null, 2));

  console.log(`✅ Written to ${outPath}`);
  console.log(`   Topics: ${result.data.specification?.topics?.length ?? 0}`);
  console.log(`   Papers: ${result.data.paperStructure?.papers?.length ?? 0}`);
  console.log(`   AOs: ${result.data.assessmentObjectives?.objectives?.length ?? 0}`);
  console.log(`   Confidence: HIGH (from source PDF)`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
