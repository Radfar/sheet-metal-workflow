# Sheet Metal Workflow

A Node.js web application for preparing fixture BOMs from SolidWorks BOM exports and DXF filename lists.

## Current workflow
1. Enter or confirm the project information and fixture schedule.
2. Select the **project root folder** once. It contains one subfolder per fixture unit, with folder names matching the fixture tags in the schedule (for example, `T01A`, `T01B`, `T01C`).
3. Each fixture folder contains a SolidWorks BOM workbook, a drawing PDF, and a `DXF` subfolder. Source files may be arranged in folders such as `SolidWorks BOM/` and `Drawing PDF/`. An optional `Excel/` folder may hold previous exports and is excluded from source BOM discovery.
4. The application discovers schedule-matched fixture folders and imports each separately. It reports missing or ambiguous source files by fixture tag.
5. The Project Schedule Summary shows each schedule unit, import status, BOM item count, and the status of each Excel export.
6. Use **Generate DXF-Based BOM Excel** or **Generate Shop-Format BOM Excel** to generate one separate workbook per successfully imported fixture. Both existing Excel formats are retained. The detailed BOM Component Tree View is not part of this project-level workflow.
7. Select generated fixtures in the Project Schedule Summary when preparing the consolidated Laser Order Request. Quantities remain based on BOM quantity per fixture multiplied by fixture schedule quantity.

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

The preferred folder picker uses the browser File System Access API (current Chrome or Edge on localhost/HTTPS) to read the selected project folder locally. Browsers without this API use the directory-input fallback, which may show a browser-managed folder upload confirmation. Only SolidWorks BOM workbooks are sent to the local application server for parsing; PDFs are processed in the browser; DXF contents are not uploaded.

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


## PDF drawing analysis trial (T01A through T14)

The project workspace includes a browser-based PDF analysis review panel for schedule entries 1–24, covering T01A through T14.

- PDF text extraction remains client-side in the browser. PDF files are not uploaded to the Node.js server.
- The analysis scope includes the schedule entries through T14. T15 and T16 are intentionally held out pending engineering review; T17 is excluded.
- For T01A–T07 drawings, the page checks follow the observed layout: page 1 fixture data/quantity, pages 2–3 channel data, page 4 angle data, and page 6 as an additional purchased-item reference page observed in the review.
- For T08–T14 drawings, the page checks follow the observed layout: page 1 fixture data/quantity, pages 3–5 channel data, page 6 end-cap data, page 7 angle data, and pages 2 and 11 as hardware-reference pages.
- These page roles are validation guides based on the reviewed drawings, not rigid extraction boundaries. Purchased-item candidates are searched across every extracted page.
- The purchased-item parser has explicit patterns for `10-32 RHMS x 1/2" C/W HEX NYLOK NUT` and `#8 RH TEK SCREWS x 1/2"`, plus a conservative generic hardware fallback.
- An adjacent explicit quantity such as `40 SETS` can be associated with a candidate when it appears in the same or immediately neighboring extracted text lines. The app does not calculate or infer missing quantities.
- Each candidate retains its fixture tag, PDF page number, extracted description, source text evidence, and any explicitly detected quantity.
- "Higher" means a recognized hardware term was accompanied by a size-like token; "Possible" means a hardware term was found without a size-like token. These are heuristic labels, not calibrated confidence scores.
- The analysis does not infer a missing part number, unit, or purchasing status. It does not append candidates to the BOM. Engineering review is required before a later BOM-integration step.
- Image-only/scanned PDFs still require OCR; this trial does not perform OCR.

This trial measures extraction quality on the T01A–T14 drawings before purchased-item candidates are allowed into the Shop-Standard BOM.