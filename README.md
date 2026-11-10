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


## Structured manufacturing data entry (V0.3.0)
Each BOM component has an expandable engineering-data form. It includes component type, material code and grade, thickness/gauge, cross-section and geometry dimensions, profile type, additional dimensions, overall finished length, plate dimensions, flat-pattern dimensions, manufacturing process, drawing part identification, fabrication piece count and piece lengths, hardware size/type/length, drawing reference, and manufacturing notes.

The user can build a draft BOM description from the entered fields using the Channel, Angle, Plate, Gusset, or Purchased hardware template, then edit the resulting description manually. The application uses only values entered by the user; it does not infer missing engineering specifications. DXF flat-pattern dimensions and material-code tokens are copied into their corresponding editable fields when a DXF is selected and those fields are blank.

**Data persistence:** this version still keeps project and fixture data in the current browser session only. Do not close or refresh the tab before exporting or sharing the results. PostgreSQL persistence is a later milestone.


## Contextual engineering examples
The manufacturing-data editor displays field-level examples drawn from the previously supplied BOM patterns (channel, angle, plate and return gusset). Examples are prompts only, not data for the current fixture. The component type field also displays a part-number-based suggestion that the user must confirm. Users must enter values from the current drawing and verify all material, gauge, dimensions and processes before generating the description.
