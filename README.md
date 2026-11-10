# Sheet Metal Workflow

A Node.js web application for preparing fixture BOMs from SolidWorks BOM exports and DXF filename lists.

## Current workflow
1. Enter project details.
2. Select a fixture from the project schedule.
3. Import the original SolidWorks BOM as either legacy Excel .xls or modern .xlsx.
4. Paste the corresponding DXF filenames and parse them.
5. Review automatic matches, select unmatched DXF files manually, and enter final manufacturing descriptions.
6. Generate the fixture BOM in the agreed Excel layout (.xlsx).

## BOM data sources
- SolidWorks BOM is the source for item number, part number and quantity per fixture.
- DXF filenames provide source-file traceability, material-code tokens and flat-pattern dimensions where recognizable.
- If a SolidWorks description is blank, the app creates a clearly labelled draft from the matched DXF filename: component type, part number, flat-pattern dimensions and the original material-code token. Engineering must review and edit the draft before release.
- The app does not infer material grade, gauge, finished profile dimensions or manufacturing process from C11/C16 or flat-pattern dimensions.
- Purchased items can remain in the BOM without an associated DXF file.
- Project total quantity is calculated in Excel as quantity per fixture multiplied by the selected fixture quantity.

## Engineering safeguards
- Original DXF filenames are preserved.
- C11/C16 are displayed only as source material-code tokens; they are not automatically converted into material grades or gauges.
- Filename dimensions are treated as flat-pattern dimensions, not finished profile dimensions.
- Unmatched SolidWorks items remain in the BOM and can be marked as purchased/no-DXF items.
- DXF matching is a convenience only and must be reviewed before release.
- No STEP geometry extraction or automatic manufacturing-feature recognition is included in this version.

## Requirements
- Node.js 20 or newer
- npm

## Run locally
```bash
npm install
npm run dev
```

Open http://localhost:3001.

The application uses port 3001 by default to keep it separate from the SCADA API on port 3000.

## SolidWorks BOM file compatibility
- Import supports both legacy Excel .xls and modern Excel .xlsx files.
- The importer looks for Part Number and Qty headers. Item No. and Description are optional.
- The application reads the workbook in memory; it does not modify the original file.
- The exported manufacturing BOM remains .xlsx.

## Current limitations
- Project and fixture data are held in browser memory and are not yet saved to PostgreSQL.
- DXF matching requires engineering review, especially for shared-part naming differences.
- The exported BOM is a draft and requires engineering approval before production use.
