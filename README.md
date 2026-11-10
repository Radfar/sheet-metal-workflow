# Sheet Metal Workflow

A Node.js web application for preparing fixture BOMs from SolidWorks BOM exports and DXF filename lists.

## Current workflow
1. Enter project details.
2. Select a fixture from the project schedule.
3. Import the original SolidWorks BOM Excel file (.xlsx).
4. Paste the corresponding DXF filenames and parse them.
5. Review automatic matches, select unmatched DXF files manually, and enter final manufacturing descriptions.
6. Generate the fixture BOM in the agreed Excel layout.

## BOM data sources
- SolidWorks BOM is the source for item number, part number and quantity per fixture.
- DXF filenames provide source-file traceability, material-code tokens and flat-pattern dimensions where recognizable.
- Manufacturing descriptions are reviewed and entered by engineering. They are not invented from incomplete filename data.
- Purchased items can remain in the BOM without an associated DXF file.
- Project total quantity is calculated in Excel as quantity per fixture multiplied by the selected fixture quantity.

## Engineering safeguards
- Original DXF filenames are preserved.
- C11/C16 are not automatically converted into material grades or gauges.
- Filename dimensions are treated as flat-pattern dimensions, not finished profile dimensions.
- Unmatched SolidWorks items remain in the BOM and can be marked as purchased/no-DXF items.
- DXF matching is a convenience only and must be reviewed before release.
- No STEP geometry extraction or automatic manufacturing-feature recognition is included in this version.

## Requirements
- Node.js 20 or newer
- npm

## Run locally
\`\`\`bash
npm install
npm run dev
\`\`\`

Open http://localhost:3001.

The application uses port 3001 by default to keep it separate from the SCADA API on port 3000.

## Current limitations
- Project and fixture data are held in browser memory and are not yet saved to PostgreSQL.
- The current BOM importer supports SolidWorks .xlsx files with headers for Part Number and Qty; Item No. and Description are optional.
- DXF matching requires engineering review, especially for shared-part naming differences.
- The exported BOM is a draft and requires engineering approval before production use.
