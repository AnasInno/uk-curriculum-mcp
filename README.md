# UK Curriculum MCP Server

An [MCP](https://modelcontextprotocol.io) server that gives AI assistants structured access to UK exam specifications — paper structures, assessment objectives, topic breakdowns, and grade boundaries.

**12 GCSE specs and growing.** New specs added daily via automated extraction.

## Available data

| Board | Subject | Code |
|-------|---------|------|
| AQA | Biology | 8461 |
| AQA | Chemistry | 8462 |
| AQA | Combined Science Trilogy | 8464 |
| AQA | English Language | 8700 |
| AQA | English Literature | 8702 |
| AQA | Geography | 8035 |
| AQA | History | 8145 |
| AQA | Mathematics | 8300 |
| AQA | Physics | 8463 |
| AQA | Religious Studies A | 8062 |
| Edexcel | English Language | 1EN0 |
| Edexcel | Mathematics | 1MA1 |

## Quick start

### With Claude Desktop / OpenClaw / any MCP client

```json
{
  "mcpServers": {
    "uk-curriculum": {
      "command": "npx",
      "args": ["-y", "uk-curriculum-mcp"]
    }
  }
}
```

That's it. The server runs over stdio and exposes 5 tools.

### Install globally

```bash
npm install -g uk-curriculum-mcp
uk-curriculum-mcp  # starts stdio server
```

## Tools

| Tool | Description |
|------|-------------|
| `list_subjects` | List all available subjects, optionally filter by board/level |
| `get_specification` | Get topic hierarchy for a subject (topic areas → subtopics) |
| `get_paper_structure` | Get exam papers — duration, marks, sections, calculator status |
| `get_assessment_objectives` | Get AOs with weighting ranges |
| `get_grade_boundaries` | Get historical grade boundaries by year/tier |

### Example

```
> list_subjects({ board: "AQA" })

{
  "count": 5,
  "subjects": [
    { "board": "AQA", "subject": "Mathematics", "level": "GCSE", "code": "8300" },
    { "board": "AQA", "subject": "English Language", "level": "GCSE", "code": "8700" },
    ...
  ]
}
```

## Data quality

Every data point includes provenance metadata:

```json
{
  "_meta": {
    "source": "aqa-8300-spec.pdf",
    "pageRef": "p.12",
    "confidence": "high",
    "verifiedDate": "2026-03-28",
    "verifiedBy": "agent",
    "tier": "authoritative"
  }
}
```

- **authoritative** = directly from exam board spec PDF (always includes `pageRef`)
- **derived** = synthesised from multiple sources (may lack `pageRef`)
- Grade boundaries are **historical only** — never use them for prediction

## Contributing specs

The fastest way to add a new spec:

1. Download the specification PDF from the exam board
2. Run the extraction script: `npx tsx scripts/extract-from-pdf.ts <pdf-path> <board> <subject> <level>`
3. Validate: `npm run validate && npm test`
4. Open a PR

See [scripts/extract-from-pdf.ts](scripts/extract-from-pdf.ts) for the extraction pipeline.

## Development

```bash
git clone https://github.com/AnasInno/uk-curriculum-mcp
cd uk-curriculum-mcp
npm install
npm run build
npm test        # 15 tests
npm start       # run server locally
```

## License

MIT
