# Approved Shop BOM Naming Rule

**Status:** Approved  
**Scope:** Shop-Standard BOM descriptions for trough sections.

## Trough section description

Use this format:

```text
[Flat-pattern dimensions] [Gauge] (Process) "[Part number]"
```

### Rules

1. Use the dimensions in fractional-inch format, as approved for the shop BOM.
2. Put the verified gauge immediately after the dimensions (for example, `16GA.`).
3. Put the manufacturing process in parentheses (for example, `(Laser/SM)`).
4. Put the exact part number in double quotes after the process marker. Do not repeat the component name immediately before the part number.
5. Do not include the prefix `Flat pattern`.
6. Do not include `Channel` or `Chn'l` in a trough-section description.
7. Apply this naming rule to trough sections in every fixture unit, not only T01A.
8. Apply it only to components identified as trough sections; ordinary channel components retain their applicable description format.
9. In the Excel Shop BOM, make the process marker and quoted part number bold.

### Approved examples

```text
91 3/16" x 24 3/16" 16GA. (Laser/SM) "T01A-A"
91 1/4" x 24 3/16" 16GA. (Laser/SM) "T01A-B"
91 3/16" x 24 3/16" 16GA. (Laser/SM) "T01A-C"

91 3/16" x 24 3/16" 16GA. (Laser/SM) "T01B-A"
91 1/4" x 24 3/16" 16GA. (Laser/SM) "T01B-B"
91 3/16" x 24 3/16" 16GA. (Laser/SM) "T01B-C"
```

This document will contain only rules and standards explicitly approved by the user. Proposed conventions, assumptions, and items awaiting confirmation must not be added as standards.

## Plate splice description

Use this format:

[Plate dimensions] [Gauge] Plt. **(Laser)** **"[Part number]"**

### Rules

1. Put the plate dimensions first, using the dimensions verified from the drawing.
2. Put the gauge immediately after the dimensions (for example, `16GA.`).
3. Put `Plt.` immediately after the gauge.
4. Put the process marker `(Laser)` after `Plt.` and make it bold in the Excel Shop BOM.
5. Do not repeat the component name `Splice` immediately before the part number.
6. Put the exact part number at the end, enclosed in double quotes, and make the quoted part number bold in the Excel Shop BOM.

### Approved examples

2" x 8" 16GA. Plt. **(Laser)** **"SPLICE-PLT-2"**

2" x 8" 16GA. Plt. **(Laser)** **"SPLICE-PLT-3"**

## BOM Excel filename

The application generates the BOM workbook filename using this structure:

```text
BOM - PO [PO Number]([Schedule Row]) - [Fixture Tag] [Description].xlsx
```

Rules:
1. Use the PO number from the project information.
2. Include the fixture's schedule row number in parentheses immediately after the PO number.
3. Include the fixture tag (for example, `T01A` or `T01B`).
4. Include the BOM filename description.
5. Remove characters that are invalid in filenames.

Example:

```text
BOM - PO 4400012611(1) - T01A Recessed in GWB ceiling.xlsx
```

For individual exports, append the applicable output suffix:
- `- Shop Standard.xlsx`
- `- DXF-Based.xlsx`

For project batch export, the generated workbooks are packaged in a ZIP file. Example:

```text
2605 - Shop-Format-BOMs.zip
```

## Shop-Standard BOM group order

The Shop-Standard BOM arranges components into the following groups, in this exact order:

1. Channels
2. Angles
3. Splices
4. End Caps
5. Common Parts
6. Gussets

A blank separator row is inserted between each non-empty group. The original SolidWorks order is preserved within each group.

**Gusset classification takes priority over Channel classification.** This is required because the standardized Gusset description contains the text `Chn'l`. Gussets must always appear in the final Gussets group and must never be included in Channels.

## Shop-Standard BOM component descriptions

The following component description patterns are implemented in the Shop-Standard BOM export.

| Component | Description structure | Example |
|---|---|---|
| Trough section | Flat-pattern dimensions + gauge + process + quoted part number | `91 3/16" x 24 3/16" 16GA. (Laser/SM) "T01A-A"` |
| End cap | Flat-pattern dimensions + gauge + `Plt.` + `(Laser)` + quoted part number | `7 11/16" x 9" 16GA. Plt. (Laser) "ENDCAP"` |
| Plate splice | Plate dimensions + gauge + `Plt.` + `(Laser)` + quoted part number | `2" x 8" 16GA. Plt. (Laser) "SPLICE-PLT-2"` |
| Gusset / GUSSET / GUS | Fixed common-part description; source dimensions and part number are not appended | `1 3/4" x 8 13/16" x 1 3/4" 16GA. Chn'l x 6 1/16" & 1 3/4" Return Gusset (Laser/SM)` |
| Angle / ANG / Short angle | Standard profile + gauge + `Angle x [overall length]` + `(Laser/SM)` + quoted part number when the second source dimension is `2 3/16"` or `2.18"` | `1" x 1 3/8" 11GA. Angle x 92 5/8" (Laser/SM) "T01A-ANG-1"` |
| Fixture channel (approved profile) | Fixed profile + gauge + `Chn'l` + overall length + process + one-piece suffix | `7 11/16" X 9" x 7 11/16" 16GA. Chn'l x 91 3/16" (Laser/SM) "T01A-A" (Made in 1pcs.) (0/0)` |
| Ordinary channel | Dimensions + gauge + `Chn'l` + length, where available | `2" x 1" 16GA. Chn'l x 90"` |
| Purchased hardware | Hardware size + hardware type + length | `#8 RH Tek Screw x 1/2"` |

### Gusset / GUSSET / GUS common-part standard

There is only one Gusset type across the project. Whenever a BOM component is identified as `GUSSET` or `GUS` (including `REMOVABLE-GUSSET`), replace its source description with this exact fixed description:

```text
1 3/4" x 8 13/16" x 1 3/4" 16GA. Chn'l x 6 1/16" & 1 3/4" Return Gusset (Laser/SM)
```

Rules:

1. Treat every identified Gusset as the same standardized common part across all fixtures.
2. Do not use the dimensions, gauge, profile, or return dimensions from the individual SolidWorks BOM row to build this description.
3. Do not append the SolidWorks part number (for example, `REMOVABLE-GUSSET`) to this description.
4. Use the fixed description exactly as shown above, including `16GA.` and `(Laser/SM)`.

### Angle / ANG / Short Angle standard profile

Apply this rule to components identified as **Angle**, **ANG**, or **Short Angle**, including identities indicated by the part number (for example, `T01A-ANG-1` or `SHORT-ANG`), when the second source dimension is exactly `2 3/16"` or `2.18"`.

For qualifying parts:

- Treat the first source dimension as the overall angle length.
- Replace the cross-section dimensions with the standard profile `1" x 1 3/8"`.
- Retain the verified gauge.
- Use the component designation `Angle`, including for Short Angle parts.
- Format the description as `1" x 1 3/8" [Gauge] Angle x [overall length] (Laser/SM)`.
- Append the exact quoted part number at the end in the Excel Shop BOM; make it bold.

Approved example:

```text
1" x 1 3/8" 11GA. Angle x 92 5/8" (Laser/SM) "T01A-ANG-1"
```

The same standard profile replacement applies when the source cross-section is written as `2.18"` instead of `2 3/16"`. Do not apply this replacement to unrelated dimensions or to non-angle components. When an angle does not have either approved second-dimension value, retain its applicable existing description formatting.
### Fixture-channel special format

Apply this rule only when all of the following conditions are met:

1. The part number follows the fixture-channel pattern: fixture tag + hyphen + one letter identifier (for example, `T01A-A`, `T01A-B`, or `T01A-C`).
2. The component is identified as a channel in the source description.
3. The second cross-section dimension is exactly `24 3/16"`.

For qualifying parts:

- Treat the first cross-section dimension as the overall channel length.
- Replace the original cross-section dimensions with the fixed profile `7 11/16" X 9" x 7 11/16"`.
- Retain the verified gauge.
- Use `Chn'l x [overall length]`.
- Use the process marker `(Laser/SM)`.
- For the current approved default, append `(Made in 1pcs.) (0/0)`.

Example:

```text
7 11/16" X 9" x 7 11/16" 16GA. Chn'l x 91 3/16" (Laser/SM) "T01A-A" (Made in 1pcs.) (0/0)
```

The one-piece suffix is the approved default for the current project. If a future drawing identifies a channel manufactured in two pieces, retrieve both individual lengths explicitly from the SolidWorks drawing and verify that their sum equals the overall channel length before changing the suffix. Do not assume equal piece lengths or infer them from the overall length. Two-piece formatting is not yet an approved automatic rule.

Channels outside this fixture-part pattern, or with a second cross-section dimension other than `24 3/16"`, retain the ordinary channel formatting.

### General description formatting

1. Material code `C16` is rendered as `16GA.` in Shop-Standard descriptions.
2. Material code `C11` is rendered as `11GA.`.
3. Decimal-inch dimensions exactly representable in sixteenths are converted to fractional inches (for example, `7.6875` becomes `7 11/16`).
4. The prefix `Flat pattern` is removed from Shop-Standard descriptions.
5. Where the description format includes a quoted part number, the part number is enclosed in double quotes and bold in the Excel output.
6. Manufacturing process markers such as `(Laser)` and `(Laser/SM)` are bold in the Excel output.
7. Trough sections use `Trough section`, not `Channel` or `Chn'l`.
8. Ordinary channel components retain their generic channel description format.

The examples above illustrate the implemented formatting patterns. Actual dimensions, gauges, component names, and part numbers must be taken from the applicable component data and drawings.

## Cutting List / Laser Order Request filename

The Cutting List workbook filename uses this structure:

```text
[Order Number] [Order Date]-[Ship Date].xlsx
```

Date formatting:
- Same month: `Nov 13-20`
- Different months in the same year: `Nov 28-Dec 05`
- Different years: `Dec 28, 26-Jan 05, 27`

Example:

```text
RA-5075 Nov 13-20.xlsx
```

If no order date is entered, the filename contains only the order number.

## Cutting List sections and grouping

The Laser Order Request workbook contains these sections:

| Section | Material classification |
|---|---|
| `COMMON PARTS` | Components identified as common |
| `16GA CRS` | 16-gauge cold-rolled steel |
| `11GA CRS` | 11-gauge cold-rolled steel |

### Common-part identification

The application identifies common components using:
1. An approved common DXF identity/key entered in the component data.
2. A DXF filename identified as `COMMON`.
3. Identical DXF file content, determined by SHA-256 hash, appearing in more than one fixture.

The original DXF filename is retained in the Cutting List.

Example DXF filename:

```text
ARI C16 2605 T01A ENDCAP 7.6875x9.DXF
```

Example Cutting List row:

| DXF FILE NAME | MATERIAL | THK | Q. REQ'D |
|---|---|---|---|
| ARI C16 2605 T01A ENDCAP 7.6875x9.DXF | CRS | 16GA | Calculated quantity |

### Required quantity calculation

The required quantity is calculated as:

```text
Q. REQ'D = Quantity per assembly × Number of fixtures
```

When the same DXF identity is consolidated across multiple fixtures, the quantities are added together.

The application groups Cutting List components by:
- DXF identity
- Material
- Thickness
- Finish

Components without a matched DXF are excluded from the Cutting List. This includes purchased items that do not require laser cutting.

## Material and thickness mapping

The current automatic DXF material-code mapping is:

| DXF material code | Material | Thickness |
|---|---|---|
| `C11` | CRS | 11GA |
| `C16` | CRS | 16GA |

The application also allows material grade and gauge to be entered manually. Manually entered values take precedence over the automatic DXF mapping.
