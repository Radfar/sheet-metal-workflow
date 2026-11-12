# Sheet Metal Workflow

A Node.js web application for preparing fixture BOMs from SolidWorks BOM exports and DXF filename lists.

## Current workflow
1. Enter or confirm the project schedule and select a fixture tag.
2. Select the fixture's folder using the browser's folder picker. The folder name must exactly match the selected uppercase fixture tag (for example, `T01A`).
3. The fixture folder must contain:
   ```text
   T01A/
   ├── T01A.pdf
   ├── T01A.xls   (or T01A.xlsx)
   └── DXF/
       ├── part-01.DXF
       ├── part-02.DXF
       └── ...
   ```
4. The application reads the SolidWorks BOM workbook and extracts the DXF filenames from the `DXF` subfolder. DXF files are fingerprinted locally with SHA-256 to detect byte-identical parts across selected fixtures; file contents are never uploaded.
5. The drawing PDF is processed locally in the browser with PDF.js. Extracted text is displayed as reference material; it is not treated as verified engineering data automatically.
6. The application matches BOM part numbers against parsed DXF filenames. Click **Build BOM Component Tree View** to display the match results.
7. Review the BOM, correct matches and engineering data, then click **Generate BOM Excel File**.
8. Project Schedule Summary displays only fixtures whose BOM Excel file has been generated. A green check indicates generation; select or clear each fixture's checkbox to include or exclude it from the Laser Order Request.
9. Generate the Laser Order Request from any selected set of generated fixture BOMs; completing the full project schedule is not required. The export button becomes available after at least one generated BOM is selected. Production quantities are calculated as BOM quantity per fixture multiplied by fixture schedule quantity.

The preferred folder picker uses the browser File System Access API (current Chrome or Edge on localhost/HTTPS) to read the selected folder locally. This avoids the browser's bulk-folder upload confirmation. Only the SolidWorks workbook is sent to the local application server for parsing; the PDF is processed in the browser. DXF files are fingerprinted locally with SHA-256 for exact byte-for-byte comparison, but their contents are never uploaded. Browsers without this API use the directory-input fallback, which may show a browser-managed folder upload confirmation.

## BOM data sources
- SolidWorks BOM is the source for item number, part number and quantity per fixture.
- DXF filenames provide source-file traceability, material-code tokens and flat-pattern dimensions where recognizable. The browser also calculates a local SHA-256 fingerprint for each DXF; matching fingerprints across selected fixtures identify byte-identical common parts without uploading DXF contents.
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


## Excel BOM output template (V0.5.0)
- The project PO number is shared across all fixture BOMs in the project.
- Exported filenames follow `BOM - PO {PO Number} - {Fixture Description}.xlsx`. Each fixture has an editable BOM filename description; an empty PO is shown as `TBD`.
- Upload the Stellar logo and radio-button graphic once as PNG or JPEG images (maximum 2 MB each). They are saved on the application server and automatically embedded in A1:D7 and G1:K7, respectively, on every exported worksheet. They do not need to be uploaded for each BOM.
- Rows 8 through 42 have a fixed height of 33 pixels (24.75 points in Excel row-height units). Rows 1 through 7 retain their image-area layout.
- Footer labels are written at A38 (Finish Date), G38 (Shift Date), K38 (Track Number #1), A39 (Note), A42 (Cut By), and H42 (Cut Date). The print area is A1:K42.
- Both branding images and the footer are repeated on each worksheet when a BOM spans multiple sheets.
- Branding images are stored in the local `data/template-assets.json` file at runtime; keep this data directory persistent when deploying or moving the application.


## PDF drawing extraction test (feature branch)

The branch `feature/pdf-drawing-extraction-test` adds a temporary browser-based PDF extraction test page:

- Open `/pdf-test.html` while running the application.
- Select a text-based engineering drawing PDF.
- Extract text page-by-page.
- Review raw extracted text and a small set of detected drawing fields.
- The PDF is processed locally in the browser and is not uploaded to the Node.js server.

This is intentionally a test before adding PDF data into the main BOM workflow. It lets us determine whether the actual SolidWorks/CATIA drawing PDFs contain usable text-layer data.

Scanned/image-only PDFs will require OCR in a later step.


## Consolidated Laser Order Request (initial implementation)

The project workspace includes a project-level Laser Order Request generator.

- The generator reads fixture BOMs retained in the current browser session.
- Required production quantity is calculated as SolidWorks BOM quantity per fixture multiplied by the fixture schedule quantity.
- Components are consolidated by exact DXF filename by default, with material code, material/grade, thickness and optional component finish included in the identity.
- If different fixture-specific DXF filenames are confirmed to represent the same approved common part, enter the same Approved common DXF identity / filename in each component's Manufacturing data. The entered identity becomes the consolidated output filename; original DXF filenames remain available in the fixture data.
- Common DXFs with no fixture tag, byte-identical DXFs found in multiple selected fixtures, and explicitly approved common identities are placed in a COMMON PARTS section. Other lines are grouped by material and thickness. Matching hashes prove byte identity, not geometric equivalence between different files.
- BOM components without a matched DXF are excluded from the laser order; purchased hardware is not a laser-cutting line.
- Material grade and gauge are not inferred from C11/C16. Enter verified values from the drawing or material specification. The material-code token is retained separately.
- The FINISH column remains blank unless a component-level cutting-list finish is explicitly supplied.
- Review the preview and exported workbook before releasing the order.

Current limitation: project, fixture BOMs, generated-status flags and selected laser-order fixtures remain in browser memory for the current tab/session only. Refreshing or closing the tab clears them. PostgreSQL persistence and multi-project storage are future milestones.


## Laser Order Request workbook format
- The Laser Order Request uses a portrait, Letter-size worksheet with the same saved company logo as the fixture BOM, positioned over A1:B5.
- Header fields use the company layout: order number at I2 with the value merged in J2:K2; customer/date on row 3; store/requested-by on row 4; PO/ship date on row 5. Row 6 is intentionally blank.
- The table uses A for continuous item numbering, B:G merged for the exact original DXF filename, H for material, I for thickness, J for required quantity, and K for finish.
- The three section groups are COMMON PARTS, 16GA CRS, and 11GA CRS. Each section receives a merged path/comment row in B:K in the format `SECTION\\LASER_DXF\\CUSTOMER\\PROJECT\\MOUNTING`. Column headings are repeated before the 16GA and 11GA detail rows.
- C16 in the parsed DXF filename material-code token maps to CRS / 16GA; C11 maps to CRS / 11GA. This is a filename-token mapping, not extraction of hidden material metadata from inside the DXF geometry.
- If no gauge can be determined from C11/C16 and no verified gauge is entered in the BOM component, export stops and asks for engineering review.
- The K column finish uses a component-specific cutting-list finish when supplied; otherwise it falls back to the fixture schedule finish.
- The exported filename follows `{Laser order number} {order date}-{ship date}.xlsx`; dates in the same month are compacted (for example, `RA-5075 Jul 02-26.xlsx`).


## Project-root batch workflow

Select the parent project folder once. It should contain one folder per fixture unit, using fixture tags from the project schedule (for example, T01A, T01B and T01C). Each fixture folder must contain:
- One SolidWorks BOM workbook (.xls or .xlsx), preferably inside a folder named "SolidWorks BOM" or "BOM".
- One drawing PDF, preferably named exactly after the fixture tag (for example, T01A.pdf).
- One or more DXF files inside a folder named "DXF".

An optional "Excel" folder may contain previous or generated workbooks; those workbooks are excluded from source BOM discovery. The app reports missing or ambiguous files per fixture. Use the batch buttons to generate one DXF-Based or Shop-Format workbook per successfully imported fixture. The detailed BOM Component Tree View is not part of the project-root workflow.

Example:
```text
Project Root/
├── T01A/
│   ├── DXF/
│   ├── Drawing PDF/T01A.pdf
│   ├── SolidWorks BOM/T01A.xlsx
│   └── Excel/                 (optional previous exports)
├── T01B/
│   ├── DXF/
│   ├── Drawing PDF/T01B.pdf
│   └── SolidWorks BOM/T01B.xlsx
└── ...
```
