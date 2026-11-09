# Initial data model

- `projects`: customer, project number, store/location, dates and status.
- `fixtures`: project, fixture tag, description, overall dimensions and assembly quantity.
- `components`: reusable part identity and engineering attributes.
- `fixture_components`: component-to-fixture relationship and quantity per assembly.
- `bom_revisions`: revision, status, author and approval history.
- `bom_lines`: revision-specific quantities, descriptions and manufacturing details.
- `materials`: approved material-code mapping, grade, thickness and gauge.
- `documents`: drawing/DXF/CAD references, revision and source metadata.

Keep three representations distinct:
1. **eBOM** — what the fixture consists of.
2. **mBOM** — how it is manufactured, including split pieces, hardware and operations.
3. **Cutting list** — required cut parts, blank dimensions, material/thickness grouping and total quantities.

A shared component can be reused across fixtures only after material, thickness, geometry, revision and approval are verified. Store the original source filename independently from normalized part numbers.
