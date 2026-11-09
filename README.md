# Sheet Metal Workflow

Engineering workflow tools for sheet-metal fabrication, starting with a configurable BOM Generator.

## V1 scope
- Create a draft BOM from pasted DXF filenames.
- Preserve each original filename for traceability.
- Extract project number, material code, fixture tag, component label and flat-pattern dimensions where recognizable.
- Allow engineering fields and quantities to be reviewed and edited before export.
- Flag missing or uncertain information rather than silently inventing values.
- Keep BOM calculations independent from the output template.

This is a local prototype. It does not yet read DXF geometry, connect to PostgreSQL, or create production-approved BOMs.

## Requirements
- Node.js 20 or newer
- npm

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Current workflow
1. Enter project and fixture details.
2. Paste one DXF filename per line.
3. Parse the filenames into draft component rows.
4. Review and edit extracted values and quantities.
5. Export a CSV draft for review.

## Engineering safeguards
- Original source filenames are never overwritten by normalized values.
- C11/C16 are not automatically converted into material grades or gauges. Add an approved project material-code mapping first.
- Filename dimensions are treated as flat-pattern dimensions, not finished profile dimensions.
- Missing quantities remain blank until confirmed.
- Shared components must not be merged across fixtures until material, thickness, geometry, revision and approval status are verified.

## Configurable BOM templates
The report layout and output filename will be configurable independently of BOM data. The initial Excel layout will be based on the supplied reference workbook after its worksheet structure and formatting have been inspected. No customer-specific layout is hard-coded into the calculation engine.

See [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/DATA-MODEL.md](docs/DATA-MODEL.md).
