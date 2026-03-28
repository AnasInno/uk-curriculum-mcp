# PDF Extraction Script

## Usage
Drop a spec PDF into `pdfs/` directory, then run:
```
node --import tsx scripts/extract-from-pdf.ts <pdf-path> <board> <subject> <level>
```

Example:
```
node --import tsx scripts/extract-from-pdf.ts pdfs/aqa-8300-sp-2024.pdf AQA Mathematics GCSE
```

## What it does
1. Reads the PDF using Claude's native PDF analysis
2. Extracts structured data matching CurriculumDataFile schema
3. Every field gets `_meta` with exact page references
4. Validates against Zod schema
5. Writes to `data/{level}/{board}/{subject}.json`

## Adding new subjects
1. Download spec PDF from exam board website
2. Run the script
3. Run `npm run validate` to check
4. Spot-check 3-5 facts against the PDF
5. Update confidence to "high" if correct
