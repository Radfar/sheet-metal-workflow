# Manufacturing BOM & DXF Workflow Standards

**Status:** Working standard, version 1.0  
**Scope:** Project and fixture identification, DXF source files, BOM data, shop-standard descriptions, cutting-list preparation, and Excel deliverables.

This document consolidates the workflow rules and formatting decisions used by the Sheet Metal Workflow application. It distinguishes confirmed rules from recommendations and unresolved items.

## 1. Core principles

1. **SolidWorks/CATIA BOM is authoritative for component part numbers and quantities.** Do not derive Qty/Assembly from DXF filenames.
2. **DXF filenames provide fabrication-file identity and may contain project, fixture, part, material-code, and flat-pattern information.** Preserve every original filename for traceability.
3. **A DXF flat-pattern size is not automatically a finished profile dimension or overall part length.**
4. **Use only source-supported engineering data.** Missing values remain blank or TBD; never invent material, gauge, process, dimensions, quantity, or fabrication split.
5. **Keep the DXF-based BOM and Shop-Standard BOM separate.** The former preserves DXF/material reference data; the latter follows the shop's manufacturing-description style.
6. **Fixture-level BOMs and project-level cutting lists serve different purposes.** A fixture BOM lists assembly requirements; a consolidated cutting list groups fabrication requirements across the project.
7. **Generated data must be reviewed and approved before release.** Parsing produces a draft, not engineering approval.

Status labels:
- **Confirmed** — explicitly supplied or approved during the workflow.
- **Recommended** — a consistent convention proposed for future use; not confirmed as an existing shop rule.
- **To confirm** — source material does not establish a definitive rule.

## 2. Project and fixture identification

A project is identified by its project/store number and customer/store identity. Each fixture configuration has its own fixture tag, such as T01A, T01B, or T02. Each fixture configuration receives its own fixture-level BOM.

Example project identity:

| Field | Example |
|---|---|
| Customer | Aritzia |
| Project / store number | 2605 |
| Project / store name | Menlo Park |
| Fixture tag | T01A |

These values are an example from the current project, not fixed values for future projects.

Preserve component part numbers exactly as provided by the authoritative CAD BOM/drawing. Do not normalize away meaningful suffixes such as L/H, R/H, A, B, or C.

## 3. DXF filename conventions

### 3.1 Supplied source pattern — confirmed examples

The supplied filenames use space-separated tokens. Examples:

~~~text
ARI C11 2605 T01A -ANG 1-92.625x2.18
ARI C11 2605 T01A -ANG 2-92.625x2.18
ARI C16 2605 ENDCAP 7.6875x9
ARI C16 2605 T01A-A TROUGH 91.187x24.171
ARI C16 2605 T01A-B TROUGH 91.125x24.171
ARI C16 2605 T01A-C TROUGH 91.187x24.171
~~~

The workflow interprets the available tokens as follows:

| Token / position | Meaning | Example |
|---|---|---|
| Customer/project prefix | Customer or project abbreviation | ARI |
| Material code | DXF material token | C11, C16 |
| Project number | Project/store identifier | 2605 |
| Fixture tag | Fixture assignment, when present | T01A |
| Part number / identity | Component identifier | T01A-A, ENDCAP |
| Component descriptor | Informational type token | TROUGH, -ANG 1 |
| Trailing dimensions | DXF flat-pattern dimensions | 91.187x24.171 |

This is a parser interpretation of supplied examples, not an instruction to rename existing CAD files. Keep the original filename unchanged and store parsed fields separately.

### 3.2 Fixture assignment and COMMON parts

- A DXF filename containing a fixture tag such as T01A is associated with that fixture, subject to validation.
- A DXF filename with no fixture tag is classified as **COMMON** (shared component), not automatically as unknown.
- COMMON means shared/untagged fixture assignment only. It does **not** establish quantity.
- COMMON parts remain eligible for the project cutting list and must be reconciled against the SolidWorks/CATIA BOM.

### 3.3 Material code and dimensions

- Preserve the exact source token, such as C11 or C16.
- A material-code-to-material/gauge mapping must be supported by an approved project mapping or authoritative drawing/material specification.
- Do not assume a material grade or gauge solely because a token looks familiar.
- Trailing filename dimensions are flat-pattern dimensions unless another source explicitly identifies them otherwise.
- Preserve raw numeric values and the original filename for traceability.
- Do not reinterpret flat-pattern dimensions as finished cross-section dimensions or finished overall length.

## 4. Component part-number examples

| Component family | Part-number examples |
|---|---|
| Trough sections | T01A-A, T01A-B, T01A-C |
| T01A angles | T01A-ANG-1, T01A-ANG-2, T01A-ANG-3 |
| Short angle | T01A-SHORT-ANG |
| End cap | ENDCAP |
| Gusset | REMOVABLE-GUSSET |
| Splice plates | SPLICE-PLT-2, SPLICE-PLT-3 |

Rules:
- Part number is the stable component identifier.
- Preserve exact spelling, punctuation, hyphens, and suffixes from the authoritative source.
- Do not duplicate the part number as an unquoted name inside a description if the exporter appends the quoted part number separately.
- A component may be included in a BOM without a DXF file, particularly purchased hardware.

## 5. BOM workbook filename

**Recommended convention — requires shop confirmation.** The source material does not establish an already-approved official BOM filename pattern, revision syntax, or release-status suffix.

Use one workbook per fixture BOM:

~~~text
<ProjectNumber>_<Customer>_<StoreName>_<FixtureTag>_BOM_<YYYY-MM-DD>.xlsx
~~~

Examples:

~~~text
2605_Aritzia_Menlo_Park_T01A_BOM_2026-11-12.xlsx
2605_Aritzia_Menlo_Park_T01B_BOM_2026-11-12.xlsx
~~~

Guidance:
- Lead with the project/store number.
- Use a stable customer/store slug; replace spaces with underscores.
- Include the fixture tag so the file is unambiguous.
- Use ISO date format YYYY-MM-DD for sortable issue dates.
- Do not silently overwrite a released workbook; retain revision/history according to the shop's document-control practice.

## 6. Consolidated cutting-list filename

**Recommended convention — requires shop confirmation.**

Use one project-level cutting list covering the required fixture set, rather than naming it as if it were a single fixture BOM:

~~~text
<ProjectNumber>_<Customer>_<StoreName>_CUTTING-LIST_<YYYY-MM-DD>.xlsx
~~~

Example:

~~~text
2605_Aritzia_Menlo_Park_CUTTING-LIST_2026-11-12.xlsx
~~~

If the shop requires separate cutting lists by material or process, add a controlled suffix only after that split is agreed, for example:

~~~text
2605_Aritzia_Menlo_Park_CUTTING-LIST_C16_2026-11-12.xlsx
~~~

Do not create material/process-specific files merely from an unverified assumption.

### 6.1 Cutting-list content and grouping

Confirmed workflow principles:
- The cutting list is a project-level output assembled from fixture BOM/component data and DXF information.
- Include fixture-specific components and COMMON/shared components as appropriate.
- Preserve source DXF filename, part number, material-code token, and flat-pattern dimensions for traceability.
- Do not infer quantities from the number of DXF files or filename tokens.
- Quantity must be sourced from the assembly BOM/approved cut list or explicitly entered and approved.
- Do not assume two DXFs are interchangeable or identical merely because their names or dimensions look similar. Reuse/grouping requires confirmed common identity or engineering approval.

Not yet defined by the source material: final cutting-list workbook column order, sheet names, material grouping, grain/orientation rules, nesting rules, remnant handling, and whether quantities are displayed per fixture, per project, or both. Confirm these against an actual released cutting-list example.

## 7. Shop-Standard BOM description rules

### 7.1 Separate export purposes

The application maintains two distinct description outputs:

1. **DXF-based BOM description** — retains DXF-derived identity, flat-pattern dimensions, and material-code reference.
2. **Shop-Standard BOM description** — follows the manufacturing-description format used in historical shop BOMs.

Do not append DXF flat-pattern dimensions or raw material-code tokens to the Shop-Standard description. Those details belong in the DXF-based record/export.

### 7.2 General formatting

| Element | Standard |
|---|---|
| Unit system | Inches |
| Dimension separator | Lowercase x |
| Fractional dimensions | Prefer fractional-inch notation, e.g. 7 11/16" |
| Gauge | 16GA. or 11GA. when verified |
| Plate abbreviation | Plt. |
| Channel abbreviation | Chn'l where the component template calls for a channel |
| Angle designation | Spell out Angle |
| Process | Parentheses, e.g. (Laser), (Laser/SM); omit if unknown |
| Part identification | Double-quoted part number |
| Excel emphasis | Quoted part number bold; process marker bold where supported |

For decimal inch dimensions converted for shop presentation, the established application rule is to round to the nearest 1/16 inch and simplify the fraction. Retain original DXF numeric values separately; do not replace source geometry with rounded presentation values.

Do not use PA. as a gauge designation. Use a verified gauge form such as 16GA. or 11GA.

### 7.3 General component templates

**Channel sections — historical general template**

~~~text
[Cross-section dimensions] [Gauge] Chn'l x [Overall length] ([Process]) "[Part ID]" [Optional piece-split information]
~~~

Historical example:

~~~text
7 11/16" X 9" x 7 11/16" 16GA. Chn'l x 141 7/8" (Laser/SM) "T01-A" (Made in 2pcs.)(99.9375/41.9375)
~~~

Cross-section dimensions must come from the finished model/drawing, not the DXF flat pattern. Overall finished length is a separate engineering value. Optional fabrication split information is included only when documented; do not force it into every channel description.

**Angle sections — historical general template**

~~~text
[Dimension 1] x [Dimension 2] [Gauge] Angle x [Overall length] ([Process]) "[Part ID]" [Optional piece-split information]
~~~

Historical example:

~~~text
1" x 1 3/8" 11GA. Angle x 144 3/4" (Laser/SM) "T01-ANG-L/H" (Made in 2pcs.)(101.375/43.375)
~~~

Use Angle, not ANG, in the description. Preserve suffixes such as L/H and R/H. Overall finished length must come from the model/drawing. Include process and split details only when verified.

**Plate / end cap**

~~~text
[Dimension 1] x [Dimension 2] [Gauge] Plt. (Process) "[Part ID]"
~~~

Historical examples:

~~~text
7 11/16" x 9" 16GA. Plt. (Laser) "ENDCAP"
2" x 8" 16GA. Plt. (Laser) "SPLICE-PLT-2"
~~~

Use Plt., not Plate.

**Return gusset**

~~~text
[Geometry dimensions] [Gauge] [Profile type] x [Additional dimensions] Return Gusset (Process)
~~~

Historical example:

~~~text
1 3/4" x 8 13/16" x 1 3/4" 16GA. Chn'l x 6 1/16" & 1 3/4" Return Gusset (Laser/SM)
~~~

A gusset may use Chn'l to describe its profile. Do not classify every component containing Chn'l as a channel assembly.

**Purchased hardware**

~~~text
[Size] [Hardware type] x [Length]
~~~

Example:

~~~text
#8 RH Tek Screw x 1/2"
~~~

Purchased hardware does not need a DXF file and should not receive sheet-metal process labels unless an authoritative specification requires them.

## 8. Approved T01A project-specific shop naming overrides

These are approved shop-format rules. The trough-section override applies to every fixture unit containing a trough, not only T01A. It takes precedence over the generic channel template for identified trough components.

### Trough sections (all fixture units)

| Part number | Shop description |
|---|---|
| T01A-A | 91 3/16" x 24 3/16" 16GA. (Laser/SM) Trough section "T01A-A" |
| T01A-B | 91 1/4" x 24 3/16" 16GA. (Laser/SM) Trough section "T01A-B" |
| T01A-C | 91 3/16" x 24 3/16" 16GA. (Laser/SM) Trough section "T01A-C" |

Rules:
- No Flat pattern prefix.
- No Channel or Chn'l label in these trough-section descriptions.
- Use Trough section as the component name.
- (Laser/SM) and the quoted part number are bold in Excel.

### T01A angles

~~~text
92 5/8" x 2 3/16" 11GA. Angle (Laser/SM) "T01A-ANG-1"
92 5/8" x 2 3/16" 11GA. Angle (Laser/SM) "T01A-ANG-2"
91 1/4" x 2 3/16" 11GA. Angle (Laser/SM) "T01A-ANG-3"
~~~

Rules:
- Remove Flat pattern.
- Use Angle immediately after gauge.
- Place (Laser/SM) after Angle.
- Do not duplicate the part name or angle designation.
- Bold the process marker and quoted part number in Excel.

### Short angle

~~~text
11 3/4" x 2 3/16" 11GA. (Laser/SM) Short Angle "T01A-SHORT-ANG"
~~~

Rules:
- Remove Flat pattern.
- Use the identity Short Angle.
- Do not repeat the part-number fragment as unquoted text.
- Bold the process marker and quoted part number in Excel.

### End cap

~~~text
7 11/16" x 9" 16GA. Plt. (Laser) End cap "ENDCAP"
~~~

Rules:
- Remove Flat pattern.
- Use Plt. and (Laser).
- Do not repeat unquoted ENDCAP.
- Bold (Laser) and the quoted part number in Excel.

### Gusset

~~~text
12 1/8" x 7 11/16" 16GA. Chn'l (Laser/SM) Gusset "REMOVABLE-GUSSET"
~~~

Rules:
- Remove Flat pattern.
- Keep Chn'l as the profile designation for this gusset.
- Normalize the component identity to Gusset.
- Bold (Laser/SM) and the quoted part number in Excel.

### Splice plates

Current special part numbers: SPLICE-PLT-2 and SPLICE-PLT-3.

Template:

~~~text
[Dimensions] [Gauge] Plt. (Laser) Splice "[Part ID]"
~~~

The process marker and quoted part number are bold in Excel.

### Other angles and channels

- Other angle rows: remove Flat pattern; put Angle immediately after gauge; avoid duplicate Angle.
- Generic channel rows: remove Flat pattern; use Chn'l only where the applicable channel template requires it.
- Apply the trough-section override to matching trough components in every fixture (for example, T01A-A/B/C and corresponding T01B or other fixture part IDs). Do not apply it to ordinary channels that are not identified as troughs.

## 9. Excel BOM structure and quantities

Typical columns:

| Column | Meaning |
|---|---|
| Item | Sequential BOM item number |
| Description | Component description (DXF-based or Shop-Standard, depending on export) |
| Qty/Assembly | Number of components required for one fixture |
| Total Qty | Qty/Assembly multiplied by fixture quantity |

Calculation:

~~~text
Total Qty = Qty/Assembly × Fixture Quantity
~~~

The historical workbook also includes header information such as customer, PO number, date, unit/fixture tag, store number, fixture quantity, fixture description/dimensions, and finish.

A previously supplied layout instruction identified these positions:

| Cell | Field |
|---|---|
| C8 | Customer / project |
| I8 | Date |
| C9 | Unit / fixture tag (e.g. T01A) |
| F9 | Store / project number |
| I9 | Fixture quantity |
| C10 | Fixture description |
| C11 | Finish |

The BOM table starts at row 12, with A = Item, B = Description, J = Qty/Assembly, and K = Total Qty. A previous instruction specified 25 BOM rows per page and repeating the table structure when content overflows.

**Template verification required:** a later proposed layout in the workflow notes used different cell positions (B8/E8/H8, etc.). Because the recorded cell maps conflict, treat the table above as the earlier explicit mapping, not a final immutable template specification, until checked against the current approved Excel template. Do not alter the live exporter based solely on this document.

## 10. Data source authority

| Data | Primary source | Notes |
|---|---|---|
| Customer / project / store | Project information and fixture schedule | Project-level identity |
| Fixture tag and fixture quantity | Fixture schedule / production order | Fixture-level values |
| Fixture dimensions and finish | Fixture schedule / approved drawing/specification | Do not infer from a part DXF |
| Component part number | SolidWorks/CATIA BOM and drawing | Preserve exact identifier |
| Quantity per assembly | SolidWorks/CATIA assembly BOM or approved cut list | Authoritative quantity source |
| Component type | Part model, drawing, and approved identity | DXF descriptor can assist but is not sufficient for all cases |
| Material code token | Original DXF filename | Preserve token exactly |
| Material grade and gauge | Approved material mapping, part properties, or drawing/specification | Do not assume from token without approved mapping |
| Flat-pattern dimensions | DXF geometry or drawing | Not finished dimensions |
| Finished profile / cross-section dimensions | SolidWorks/CATIA model or engineering drawing | Keep separate from flat pattern |
| Overall finished length | Model or engineering drawing | Do not calculate from DXF blank size |
| Manufacturing process | Manufacturing specification / engineering confirmation | Omit if unavailable |
| Piece count and individual piece lengths | Model/drawing/manufacturing information | Include only when documented |
| Purchased hardware specification | BOM / component catalogue | May have no DXF |
| Finish | Fixture schedule / finish specification | Keep exact finish code and description |

## 11. Reconciliation and validation workflow

1. Import project/fixture schedule.
2. Import SolidWorks/CATIA BOM and retain part numbers and quantities.
3. Import DXF filenames and associate each file with a part number, material token, and fixture where possible.
4. Classify untagged DXFs as COMMON.
5. Match BOM parts to DXF files.
6. Flag missing DXFs, unmatched DXFs, duplicate/ambiguous matches, and missing material mappings.
7. Add verified engineering data from the model/drawing or controlled manual entry.
8. Generate draft fixture BOMs.
9. Review and approve descriptions and quantities.
10. Generate the project cutting list from approved component records.
11. Export and archive deliverables with traceable source references.

The application should distinguish Matched, COMMON, Missing DXF, Unmatched DXF, Ambiguous, Missing engineering data, and Quantity pending. Warnings must remain visible; do not silently drop incomplete records.

## 12. Traceability and data integrity

- Keep raw source data separate from normalized/application-generated data.
- Preserve original DXF filenames and source document references.
- Store raw DXF dimensions separately from rounded shop-display dimensions.
- Keep SolidWorks/CATIA source quantity distinct from calculated project total quantity.
- Keep DXF-based descriptions distinct from Shop-Standard descriptions.
- Any manually entered engineering value should be reviewable and attributable to its source/approval.
- Historical BOMs are templates for presentation and ordering; they are not a source of manufacturing values for a new project.

## 13. Items still requiring shop confirmation

The current source material does not establish:
- Official BOM and cutting-list filename patterns, revision syntax, or release suffixes.
- Final cutting-list workbook columns, tabs, grouping, and quantity presentation.
- Final approved Excel header-cell map (the recorded mappings conflict).
- DXF/CAD revision suffix conventions and duplicate-file resolution.
- Material nesting/optimization, grain direction, kerf, and remnant management.
- Cutting-list issue/release and approval control.
- Whether cutting lists are split by material/process or issued as one project-level workbook.

Confirm these against actual released shop documents before treating the recommended conventions as mandatory.
